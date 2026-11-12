-- ════════════════════════════════════════════════════════════════════════════
-- HPE — PATRICK PERSONAL · Row Level Security
-- ════════════════════════════════════════════════════════════════════════════
-- Regras:
--   · O personal (role = 'admin') administra todos os dados dos seus alunos.
--   · Cada aluno acessa exclusivamente os próprios dados.
--   · Nenhum aluno vê dados de outro aluno, inclusive financeiros e fotos.
--   · Conteúdo institucional é legível por visitantes anônimos.
-- ════════════════════════════════════════════════════════════════════════════

alter table public.profiles             enable row level security;
alter table public.personal_settings    enable row level security;
alter table public.services             enable row level security;
alter table public.students             enable row level security;
alter table public.availability         enable row level security;
alter table public.blocked_times        enable row level security;
alter table public.appointments         enable row level security;
alter table public.training_plans       enable row level security;
alter table public.training_days        enable row level security;
alter table public.exercises            enable row level security;
alter table public.exercise_logs        enable row level security;
alter table public.physical_assessments enable row level security;
alter table public.body_measurements    enable row level security;
alter table public.progress_photos      enable row level security;
alter table public.subscriptions        enable row level security;
alter table public.payments             enable row level security;
alter table public.expenses             enable row level security;
alter table public.notifications        enable row level security;
alter table public.messages             enable row level security;
alter table public.testimonials         enable row level security;

-- ─── profiles ───────────────────────────────────────────────────────────────
create policy "profiles: ver o próprio perfil"
  on public.profiles for select to authenticated
  using (id = auth.uid() or public.is_admin());

create policy "profiles: editar o próprio perfil"
  on public.profiles for update to authenticated
  using (id = auth.uid() or public.is_admin())
  with check (id = auth.uid() or public.is_admin());

-- A coluna `role` nunca é alterável pelo próprio usuário.
create or replace function public.guard_profile_role()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.role is distinct from old.role and not public.is_admin() then
    raise exception 'Alteração de permissão não autorizada.' using errcode = '42501';
  end if;
  return new;
end;
$$;

create trigger profiles_guard_role
  before update on public.profiles
  for each row execute function public.guard_profile_role();

-- ─── personal_settings · conteúdo institucional público ─────────────────────
create policy "personal_settings: leitura pública"
  on public.personal_settings for select to anon, authenticated
  using (true);

create policy "personal_settings: só o personal escreve"
  on public.personal_settings for all to authenticated
  using (public.is_admin()) with check (public.is_admin());

-- ─── services ───────────────────────────────────────────────────────────────
create policy "services: leitura pública"
  on public.services for select to anon, authenticated using (true);

create policy "services: só o personal escreve"
  on public.services for all to authenticated
  using (public.is_admin()) with check (public.is_admin());

-- ─── students ───────────────────────────────────────────────────────────────
create policy "students: personal administra todos"
  on public.students for all to authenticated
  using (public.is_admin()) with check (public.is_admin());

create policy "students: aluno vê o próprio cadastro"
  on public.students for select to authenticated
  using (profile_id = auth.uid());

-- ─── availability / blocked_times · agenda pública ──────────────────────────
create policy "availability: leitura pública"
  on public.availability for select to anon, authenticated using (active);

create policy "availability: só o personal escreve"
  on public.availability for all to authenticated
  using (public.is_admin()) with check (public.is_admin());

create policy "blocked_times: leitura pública"
  on public.blocked_times for select to anon, authenticated using (true);

create policy "blocked_times: só o personal escreve"
  on public.blocked_times for all to authenticated
  using (public.is_admin()) with check (public.is_admin());

-- ─── appointments ───────────────────────────────────────────────────────────
create policy "appointments: personal administra todos"
  on public.appointments for all to authenticated
  using (public.is_admin()) with check (public.is_admin());

create policy "appointments: aluno vê os próprios"
  on public.appointments for select to authenticated
  using (student_id = public.current_student_id());

-- Inserção e cancelamento pelo aluno acontecem só via RPC
-- (book_appointment / cancel_appointment), que revalidam as regras.

-- ─── training_plans ─────────────────────────────────────────────────────────
create policy "training_plans: personal administra todos"
  on public.training_plans for all to authenticated
  using (public.is_admin()) with check (public.is_admin());

create policy "training_plans: aluno vê as fichas publicadas para si"
  on public.training_plans for select to authenticated
  using (published and student_id = public.current_student_id());

-- ─── training_days ──────────────────────────────────────────────────────────
create policy "training_days: personal administra todos"
  on public.training_days for all to authenticated
  using (public.is_admin()) with check (public.is_admin());

create policy "training_days: aluno vê os dias das próprias fichas"
  on public.training_days for select to authenticated
  using (exists (
    select 1 from public.training_plans p
     where p.id = plan_id
       and p.published
       and p.student_id = public.current_student_id()
  ));

-- ─── exercises ──────────────────────────────────────────────────────────────
create policy "exercises: personal administra todos"
  on public.exercises for all to authenticated
  using (public.is_admin()) with check (public.is_admin());

create policy "exercises: aluno vê os exercícios das próprias fichas"
  on public.exercises for select to authenticated
  using (exists (
    select 1
      from public.training_days d
      join public.training_plans p on p.id = d.plan_id
     where d.id = day_id
       and p.published
       and p.student_id = public.current_student_id()
  ));

-- ─── exercise_logs · o aluno registra a própria execução ────────────────────
create policy "exercise_logs: personal administra todos"
  on public.exercise_logs for all to authenticated
  using (public.is_admin()) with check (public.is_admin());

create policy "exercise_logs: aluno lê os próprios"
  on public.exercise_logs for select to authenticated
  using (student_id = public.current_student_id());

create policy "exercise_logs: aluno registra os próprios"
  on public.exercise_logs for insert to authenticated
  with check (student_id = public.current_student_id());

create policy "exercise_logs: aluno corrige os próprios"
  on public.exercise_logs for update to authenticated
  using (student_id = public.current_student_id())
  with check (student_id = public.current_student_id());

create policy "exercise_logs: aluno apaga os próprios"
  on public.exercise_logs for delete to authenticated
  using (student_id = public.current_student_id());

-- ─── physical_assessments ───────────────────────────────────────────────────
create policy "assessments: personal administra todos"
  on public.physical_assessments for all to authenticated
  using (public.is_admin()) with check (public.is_admin());

create policy "assessments: aluno lê as próprias"
  on public.physical_assessments for select to authenticated
  using (student_id = public.current_student_id());

-- ─── body_measurements ──────────────────────────────────────────────────────
create policy "measurements: personal administra todas"
  on public.body_measurements for all to authenticated
  using (public.is_admin()) with check (public.is_admin());

create policy "measurements: aluno lê as próprias"
  on public.body_measurements for select to authenticated
  using (exists (
    select 1 from public.physical_assessments a
     where a.id = assessment_id
       and a.student_id = public.current_student_id()
  ));

-- ─── progress_photos · dado sensível ────────────────────────────────────────
create policy "progress_photos: personal administra todas"
  on public.progress_photos for all to authenticated
  using (public.is_admin()) with check (public.is_admin());

create policy "progress_photos: aluno lê somente as próprias"
  on public.progress_photos for select to authenticated
  using (student_id = public.current_student_id());

-- ─── subscriptions / payments · financeiro ──────────────────────────────────
create policy "subscriptions: personal administra todas"
  on public.subscriptions for all to authenticated
  using (public.is_admin()) with check (public.is_admin());

create policy "subscriptions: aluno lê as próprias"
  on public.subscriptions for select to authenticated
  using (student_id = public.current_student_id());

create policy "payments: personal administra todos"
  on public.payments for all to authenticated
  using (public.is_admin()) with check (public.is_admin());

create policy "payments: aluno lê os próprios"
  on public.payments for select to authenticated
  using (student_id = public.current_student_id());

-- ─── expenses · exclusivo do personal ───────────────────────────────────────
create policy "expenses: exclusivo do personal"
  on public.expenses for all to authenticated
  using (public.is_admin()) with check (public.is_admin());

-- ─── notifications ──────────────────────────────────────────────────────────
create policy "notifications: personal administra todas"
  on public.notifications for all to authenticated
  using (public.is_admin()) with check (public.is_admin());

create policy "notifications: destinatário lê as próprias"
  on public.notifications for select to authenticated
  using (profile_id = auth.uid());

create policy "notifications: destinatário marca como lida"
  on public.notifications for update to authenticated
  using (profile_id = auth.uid())
  with check (profile_id = auth.uid());

-- ─── messages ───────────────────────────────────────────────────────────────
create policy "messages: personal administra todas"
  on public.messages for all to authenticated
  using (public.is_admin()) with check (public.is_admin());

create policy "messages: aluno lê os avisos destinados a si"
  on public.messages for select to authenticated
  using (student_id is null or student_id = public.current_student_id());

-- ─── testimonials ───────────────────────────────────────────────────────────
create policy "testimonials: leitura pública dos publicados"
  on public.testimonials for select to anon, authenticated
  using (published);

create policy "testimonials: personal administra todos"
  on public.testimonials for all to authenticated
  using (public.is_admin()) with check (public.is_admin());
