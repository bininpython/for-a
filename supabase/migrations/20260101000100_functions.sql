-- ════════════════════════════════════════════════════════════════════════════
-- HPE — PATRICK PERSONAL · Funções de domínio
-- ════════════════════════════════════════════════════════════════════════════

-- ─── Helpers de permissão ───────────────────────────────────────────────────
-- SECURITY DEFINER para evitar recursão infinita nas políticas de `profiles`.

create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid() and role = 'admin'
  );
$$;

create or replace function public.current_student_id()
returns uuid
language sql
stable
security definer
set search_path = public
as $$
  select id from public.students where profile_id = auth.uid() limit 1;
$$;

revoke all on function public.is_admin() from public;
revoke all on function public.current_student_id() from public;
grant execute on function public.is_admin() to authenticated;
grant execute on function public.current_student_id() to authenticated;

-- ─── Criação automática do perfil no signup ─────────────────────────────────
-- O primeiro usuário cujo e-mail corresponde a `app.admin_email` entra como
-- admin. Todos os demais entram como aluno — nunca como administrador.

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  admin_email text := current_setting('app.admin_email', true);
  resolved_role user_role := 'student';
begin
  if coalesce(new.raw_user_meta_data ->> 'role', '') = 'admin'
     and admin_email is not null
     and lower(new.email) = lower(admin_email) then
    resolved_role := 'admin';
  elsif admin_email is not null and lower(new.email) = lower(admin_email) then
    resolved_role := 'admin';
  end if;

  insert into public.profiles (id, role, full_name, email, phone)
  values (
    new.id,
    resolved_role,
    coalesce(new.raw_user_meta_data ->> 'full_name', ''),
    new.email,
    new.raw_user_meta_data ->> 'phone'
  )
  on conflict (id) do nothing;

  -- Vincula a conta a um cadastro de aluno já criado pelo personal
  if resolved_role = 'student' and new.email is not null then
    update public.students
       set profile_id = new.id
     where profile_id is null
       and lower(email) = lower(new.email);
  end if;

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ════════════════════════════════════════════════════════════════════════════
-- Disponibilidade de agenda · calculada no servidor
-- ════════════════════════════════════════════════════════════════════════════
-- Gera os horários livres de um dia a partir de:
--   availability (janelas semanais) − blocked_times − appointments ativos
-- respeitando duração do serviço, intervalo entre atendimentos e antecedência.

create or replace function public.available_slots(
  p_date         date,
  p_service_id   uuid default null,
  p_timezone     text default 'America/Sao_Paulo'
)
returns table (slot_start timestamptz, slot_end timestamptz)
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_duration  int;
  v_buffer    int;
  v_horizon   int;
  v_weekday   int;
begin
  select coalesce(s.duration_minutes, ps.default_session_minutes, 60),
         coalesce(ps.buffer_minutes, 0),
         coalesce(ps.booking_horizon_days, 30)
    into v_duration, v_buffer, v_horizon
    from public.personal_settings ps
    left join public.services s on s.id = p_service_id
   limit 1;

  v_duration := coalesce(v_duration, 60);
  v_buffer   := coalesce(v_buffer, 0);
  v_horizon  := coalesce(v_horizon, 30);

  -- Fora do horizonte de agendamento ou no passado: nenhum horário.
  if p_date < (now() at time zone p_timezone)::date
     or p_date > ((now() at time zone p_timezone)::date + v_horizon) then
    return;
  end if;

  v_weekday := extract(dow from p_date)::int;

  return query
  with windows as (
    select
      ((p_date + a.start_time) at time zone p_timezone) as win_start,
      ((p_date + a.end_time)   at time zone p_timezone) as win_end
    from public.availability a
    where a.active and a.weekday = v_weekday
  ),
  candidates as (
    select
      gs                                          as slot_start,
      gs + make_interval(mins => v_duration)      as slot_end
    from windows w
    cross join generate_series(
      w.win_start,
      w.win_end - make_interval(mins => v_duration),
      make_interval(mins => v_duration + v_buffer)
    ) as gs
    where gs + make_interval(mins => v_duration) <= w.win_end
  )
  select c.slot_start, c.slot_end
    from candidates c
   where c.slot_start > now()
     -- não colide com bloqueios
     and not exists (
       select 1 from public.blocked_times b
        where tstzrange(b.starts_at, b.ends_at)
           && tstzrange(c.slot_start, c.slot_end)
     )
     -- não colide com atendimentos que ocupam a agenda
     and not exists (
       select 1 from public.appointments ap
        where ap.status in ('requested', 'confirmed', 'completed')
          and tstzrange(
                ap.starts_at,
                ap.ends_at + make_interval(mins => v_buffer)
              ) && tstzrange(c.slot_start, c.slot_end)
     )
   order by c.slot_start;
end;
$$;

grant execute on function public.available_slots(date, uuid, text) to authenticated, anon;

-- ════════════════════════════════════════════════════════════════════════════
-- Agendamento atômico
-- ════════════════════════════════════════════════════════════════════════════
-- Revalida o horário no servidor e insere. A constraint EXCLUDE em
-- `appointments` garante que duas requisições simultâneas não ocupem o mesmo
-- horário: a segunda falha com 23P01 e é traduzida em erro de negócio.

create or replace function public.book_appointment(
  p_service_id    uuid,
  p_starts_at     timestamptz,
  p_student_notes text default null,
  p_student_id    uuid default null
)
returns public.appointments
language plpgsql
security definer
set search_path = public
as $$
declare
  v_student_id uuid;
  v_duration   int;
  v_buffer     int;
  v_ends_at    timestamptz;
  v_row        public.appointments;
begin
  -- Quem está agendando
  if public.is_admin() then
    v_student_id := p_student_id;
    if v_student_id is null then
      raise exception 'Informe o aluno do atendimento.' using errcode = 'P0001';
    end if;
  else
    v_student_id := public.current_student_id();
    if v_student_id is null then
      raise exception 'Sua conta ainda não está vinculada a um cadastro de aluno.'
        using errcode = 'P0001';
    end if;
  end if;

  if not exists (
    select 1 from public.students
     where id = v_student_id and contract_status in ('active', 'paused')
  ) then
    raise exception 'Cadastro de aluno inativo. Procure o personal.'
      using errcode = 'P0001';
  end if;

  select coalesce(s.duration_minutes, ps.default_session_minutes, 60),
         coalesce(ps.buffer_minutes, 0)
    into v_duration, v_buffer
    from public.personal_settings ps
    left join public.services s on s.id = p_service_id
   limit 1;

  v_duration := coalesce(v_duration, 60);
  v_buffer   := coalesce(v_buffer, 0);
  v_ends_at  := p_starts_at + make_interval(mins => v_duration);

  -- Revalidação: o horário precisa estar entre os livres calculados agora.
  -- O personal pode criar atendimento manual fora da janela padrão.
  if not public.is_admin() then
    if not exists (
      select 1
        from public.available_slots(
               (p_starts_at at time zone 'America/Sao_Paulo')::date,
               p_service_id
             ) s
       where s.slot_start = p_starts_at
    ) then
      raise exception 'Este horário não está mais disponível.'
        using errcode = 'P0001';
    end if;
  end if;

  begin
    insert into public.appointments (
      student_id, service_id, starts_at, ends_at,
      status, student_notes, created_by
    )
    values (
      v_student_id, p_service_id, p_starts_at, v_ends_at,
      (case when public.is_admin() then 'confirmed' else 'requested' end)::appointment_status,
      p_student_notes, auth.uid()
    )
    returning * into v_row;
  exception
    when exclusion_violation then
      raise exception 'Este horário acabou de ser ocupado. Escolha outro.'
        using errcode = 'P0001';
  end;

  -- Notificação in-app para o personal
  insert into public.notifications (profile_id, kind, title, body, link)
  select p.id,
         'appointment',
         'Novo agendamento solicitado',
         (select full_name from public.students where id = v_student_id)
           || ' · ' || to_char(p_starts_at at time zone 'America/Sao_Paulo', 'DD/MM HH24:MI'),
         '/admin/agenda'
    from public.profiles p
   where p.role = 'admin';

  return v_row;
end;
$$;

grant execute on function public.book_appointment(uuid, timestamptz, text, uuid) to authenticated;

-- ════════════════════════════════════════════════════════════════════════════
-- Cancelamento com prazo mínimo
-- ════════════════════════════════════════════════════════════════════════════

create or replace function public.cancel_appointment(
  p_appointment_id uuid,
  p_reason         text default null
)
returns public.appointments
language plpgsql
security definer
set search_path = public
as $$
declare
  v_row       public.appointments;
  v_min_hours int;
begin
  select * into v_row from public.appointments where id = p_appointment_id;
  if not found then
    raise exception 'Agendamento não encontrado.' using errcode = 'P0001';
  end if;

  if not public.is_admin() then
    if v_row.student_id is distinct from public.current_student_id() then
      raise exception 'Agendamento não encontrado.' using errcode = 'P0001';
    end if;

    select coalesce(min_hours_to_cancel, 12) into v_min_hours
      from public.personal_settings limit 1;

    if v_row.starts_at - now() < make_interval(hours => coalesce(v_min_hours, 12)) then
      raise exception
        'Cancelamentos devem ser feitos com pelo menos % horas de antecedência. Fale com o personal.',
        coalesce(v_min_hours, 12)
        using errcode = 'P0001';
    end if;
  end if;

  if v_row.status in ('cancelled', 'completed') then
    raise exception 'Este atendimento não pode mais ser cancelado.' using errcode = 'P0001';
  end if;

  update public.appointments
     set status = 'cancelled',
         cancelled_at = now(),
         cancelled_by = auth.uid(),
         cancel_reason = p_reason
   where id = p_appointment_id
   returning * into v_row;

  return v_row;
end;
$$;

grant execute on function public.cancel_appointment(uuid, text) to authenticated;

-- ════════════════════════════════════════════════════════════════════════════
-- Indicadores do dashboard · uma única consulta
-- ════════════════════════════════════════════════════════════════════════════

create or replace function public.admin_overview(
  p_timezone text default 'America/Sao_Paulo'
)
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_today date := (now() at time zone p_timezone)::date;
  v_month_start date := date_trunc('month', v_today)::date;
  v_result jsonb;
begin
  if not public.is_admin() then
    raise exception 'Acesso negado.' using errcode = '42501';
  end if;

  select jsonb_build_object(
    'active_students', (
      select count(*) from public.students where contract_status = 'active'
    ),
    'new_students', (
      select count(*) from public.students where joined_at >= v_month_start
    ),
    'inactive_students', (
      select count(*) from public.students
       where contract_status in ('inactive', 'paused')
    ),
    'sessions_today', (
      select count(*) from public.appointments
       where status in ('requested', 'confirmed', 'completed')
         and (starts_at at time zone p_timezone)::date = v_today
    ),
    'pending_requests', (
      select count(*) from public.appointments where status = 'requested'
    ),
    'revenue_month', (
      select coalesce(sum(amount), 0) from public.payments
       where status = 'paid' and reference_month = v_month_start
    ),
    'pending_amount', (
      select coalesce(sum(amount), 0) from public.payments
       where status in ('pending', 'overdue')
    ),
    'overdue_count', (
      select count(*) from public.payments
       where status = 'overdue'
          or (status = 'pending' and due_date < v_today)
    ),
    'expenses_month', (
      select coalesce(sum(amount), 0) from public.expenses
       where spent_on >= v_month_start
    ),
    'attendance_rate', (
      select case
        when count(*) filter (
          where status in ('completed', 'no_show')
        ) = 0 then null
        else round(
          100.0 * count(*) filter (where status = 'completed')
          / nullif(count(*) filter (where status in ('completed', 'no_show')), 0), 1
        )
      end
      from public.appointments
      where starts_at >= v_month_start
    ),
    'next_appointments', (
      select coalesce(jsonb_agg(x order by x->>'starts_at'), '[]'::jsonb)
      from (
        select jsonb_build_object(
          'id', a.id,
          'starts_at', a.starts_at,
          'ends_at', a.ends_at,
          'status', a.status,
          'student_name', s.full_name,
          'student_photo', s.photo_url,
          'service_name', sv.name
        ) as x
        from public.appointments a
        join public.students s on s.id = a.student_id
        left join public.services sv on sv.id = a.service_id
        where a.starts_at >= now()
          and a.status in ('requested', 'confirmed')
        order by a.starts_at
        limit 8
      ) t
    ),
    'students_growth', (
      select coalesce(jsonb_agg(
        jsonb_build_object('month', to_char(m, 'YYYY-MM'), 'total', c)
        order by m
      ), '[]'::jsonb)
      from (
        select m,
               (select count(*) from public.students s
                 where s.joined_at <= (m + interval '1 month - 1 day')::date
                   and s.contract_status <> 'archived') as c
        from generate_series(
          (v_month_start - interval '5 months')::date,
          v_month_start,
          interval '1 month'
        ) m
      ) g
    ),
    'revenue_series', (
      select coalesce(jsonb_agg(
        jsonb_build_object(
          'month', to_char(m, 'YYYY-MM'),
          'received', coalesce((
            select sum(amount) from public.payments p
             where p.status = 'paid' and p.reference_month = m::date
          ), 0),
          'pending', coalesce((
            select sum(amount) from public.payments p
             where p.status in ('pending', 'overdue') and p.reference_month = m::date
          ), 0),
          'expenses', coalesce((
            select sum(amount) from public.expenses e
             where date_trunc('month', e.spent_on) = m
          ), 0)
        ) order by m
      ), '[]'::jsonb)
      from generate_series(
        (v_month_start - interval '5 months')::date,
        v_month_start,
        interval '1 month'
      ) m
    ),
    'occupancy', (
      select coalesce(jsonb_agg(
        jsonb_build_object('day', d, 'booked', b) order by d
      ), '[]'::jsonb)
      from (
        select d::date as d,
               (select count(*) from public.appointments a
                 where a.status in ('requested', 'confirmed', 'completed')
                   and (a.starts_at at time zone p_timezone)::date = d::date) as b
        from generate_series(v_today, v_today + 13, interval '1 day') d
      ) o
    )
  ) into v_result;

  return v_result;
end;
$$;

grant execute on function public.admin_overview(text) to authenticated;

-- ════════════════════════════════════════════════════════════════════════════
-- Marca mensalidades vencidas (chamar por cron ou manualmente)
-- ════════════════════════════════════════════════════════════════════════════

create or replace function public.refresh_overdue_payments()
returns int
language plpgsql
security definer
set search_path = public
as $$
declare v_count int;
begin
  update public.payments
     set status = 'overdue'
   where status = 'pending'
     and due_date < current_date;
  get diagnostics v_count = row_count;
  return v_count;
end;
$$;

grant execute on function public.refresh_overdue_payments() to authenticated;
