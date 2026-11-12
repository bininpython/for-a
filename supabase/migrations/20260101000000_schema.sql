-- ════════════════════════════════════════════════════════════════════════════
-- HPE — PATRICK PERSONAL · Schema relacional
-- ════════════════════════════════════════════════════════════════════════════

create extension if not exists "pgcrypto";
create extension if not exists "btree_gist";

-- ─── Tipos ──────────────────────────────────────────────────────────────────
create type user_role           as enum ('admin', 'student');
create type contract_status     as enum ('active', 'paused', 'inactive', 'archived');
create type training_level      as enum ('beginner', 'intermediate', 'advanced');
create type appointment_status  as enum ('requested', 'confirmed', 'completed', 'cancelled', 'no_show');
create type payment_status      as enum ('paid', 'pending', 'overdue', 'exempt', 'cancelled');
create type notification_kind   as enum ('appointment', 'schedule_change', 'reminder', 'payment', 'announcement');
create type delivery_channel    as enum ('in_app', 'whatsapp', 'email');
create type delivery_status     as enum ('pending', 'sent', 'failed', 'skipped');

-- ─── profiles ───────────────────────────────────────────────────────────────
-- Espelha auth.users. É a origem da verdade sobre permissões.
create table public.profiles (
  id          uuid primary key references auth.users (id) on delete cascade,
  role        user_role not null default 'student',
  full_name   text not null default '',
  email       text,
  phone       text,
  avatar_url  text,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

-- ─── personal_settings ──────────────────────────────────────────────────────
-- Linha única com os dados públicos e operacionais do personal.
create table public.personal_settings (
  id                     uuid primary key default gen_random_uuid(),
  profile_id             uuid not null unique references public.profiles (id) on delete cascade,
  professional_name      text not null default 'Patrick Personal',
  headline               text,
  bio                    text,
  philosophy             text,
  methodology            text,
  experience             text,
  differentials          text[] not null default '{}',
  specialties            text[] not null default '{}',
  certifications         text[] not null default '{}',
  photo_url              text,
  logo_url               text,
  whatsapp               text,
  instagram              text,
  public_email           text,
  gym_name               text not null default 'ALP FIT',
  gym_address            text,
  gym_city               text not null default 'Coronel Fabriciano/MG',
  gym_maps_url           text,
  attendance_notes       text,
  default_session_minutes int not null default 60 check (default_session_minutes between 15 and 240),
  buffer_minutes          int not null default 0 check (buffer_minutes between 0 and 120),
  min_hours_to_cancel     int not null default 12 check (min_hours_to_cancel >= 0),
  booking_horizon_days    int not null default 30 check (booking_horizon_days between 1 and 180),
  updated_at             timestamptz not null default now()
);

-- ─── services ───────────────────────────────────────────────────────────────
create table public.services (
  id              uuid primary key default gen_random_uuid(),
  slug            text not null unique,
  name            text not null,
  description     text,
  benefits        text[] not null default '{}',
  duration_minutes int not null default 60 check (duration_minutes between 15 and 240),
  is_individual   boolean not null default true,
  max_capacity    int not null default 1 check (max_capacity >= 1),
  bookable        boolean not null default true,
  sort_order      int not null default 0,
  created_at      timestamptz not null default now()
);

-- ─── students ───────────────────────────────────────────────────────────────
create table public.students (
  id                 uuid primary key default gen_random_uuid(),
  profile_id         uuid unique references public.profiles (id) on delete set null,
  full_name          text not null,
  photo_url          text,
  birth_date         date,
  phone              text,
  email              text,
  cpf                text,
  joined_at          date not null default current_date,
  main_goal          text,
  training_level     training_level not null default 'beginner',
  plan_name          text,
  monthly_fee        numeric(10,2) check (monthly_fee >= 0),
  due_day            int check (due_day between 1 and 31),
  contract_status    contract_status not null default 'active',
  notes              text,
  emergency_contact_name  text,
  emergency_contact_phone text,
  lgpd_consent_at    timestamptz,
  photo_consent      boolean not null default false,
  created_at         timestamptz not null default now(),
  updated_at         timestamptz not null default now()
);

create index students_contract_status_idx on public.students (contract_status);
create index students_profile_idx on public.students (profile_id);
create unique index students_cpf_key on public.students (cpf) where cpf is not null;

-- ─── availability · janelas semanais recorrentes ────────────────────────────
create table public.availability (
  id          uuid primary key default gen_random_uuid(),
  weekday     int not null check (weekday between 0 and 6), -- 0 = domingo
  start_time  time not null,
  end_time    time not null,
  active      boolean not null default true,
  created_at  timestamptz not null default now(),
  constraint availability_order check (end_time > start_time)
);

create index availability_weekday_idx on public.availability (weekday) where active;

-- ─── blocked_times · feriados, férias, bloqueios pontuais ───────────────────
create table public.blocked_times (
  id         uuid primary key default gen_random_uuid(),
  starts_at  timestamptz not null,
  ends_at    timestamptz not null,
  reason     text,
  all_day    boolean not null default false,
  created_at timestamptz not null default now(),
  constraint blocked_times_order check (ends_at > starts_at)
);

create index blocked_times_range_idx on public.blocked_times using gist (
  tstzrange(starts_at, ends_at)
);

-- ─── appointments ───────────────────────────────────────────────────────────
create table public.appointments (
  id            uuid primary key default gen_random_uuid(),
  student_id    uuid not null references public.students (id) on delete cascade,
  service_id    uuid references public.services (id) on delete set null,
  starts_at     timestamptz not null,
  ends_at       timestamptz not null,
  status        appointment_status not null default 'requested',
  notes         text,
  student_notes text,
  cancelled_at  timestamptz,
  cancelled_by  uuid references public.profiles (id) on delete set null,
  cancel_reason text,
  created_by    uuid references public.profiles (id) on delete set null,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),
  constraint appointments_order check (ends_at > starts_at)
);

create index appointments_starts_idx on public.appointments (starts_at);
create index appointments_student_idx on public.appointments (student_id, starts_at desc);
create index appointments_status_idx on public.appointments (status);

-- Impede dois atendimentos individuais sobrepostos na agenda do personal.
-- Agendamentos cancelados / faltas não ocupam o horário.
create index appointments_active_range_idx on public.appointments using gist (
  tstzrange(starts_at, ends_at)
) where status in ('requested', 'confirmed', 'completed');

alter table public.appointments
  add constraint appointments_no_overlap
  exclude using gist (tstzrange(starts_at, ends_at) with &&)
  where (status in ('requested', 'confirmed', 'completed'));

-- ─── training_plans · fichas ────────────────────────────────────────────────
create table public.training_plans (
  id          uuid primary key default gen_random_uuid(),
  student_id  uuid references public.students (id) on delete cascade,
  name        text not null,
  goal        text,
  split       text,                       -- 'A/B', 'A/B/C', ...
  notes       text,
  is_template boolean not null default false,
  published   boolean not null default false,
  starts_on   date,
  ends_on     date,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  -- um modelo reutilizável não pertence a um aluno
  constraint training_plans_owner check (
    (is_template and student_id is null) or (not is_template and student_id is not null)
  )
);

create index training_plans_student_idx on public.training_plans (student_id) where not is_template;

-- ─── training_days · TREINO A, TREINO B … ───────────────────────────────────
create table public.training_days (
  id          uuid primary key default gen_random_uuid(),
  plan_id     uuid not null references public.training_plans (id) on delete cascade,
  label       text not null,              -- 'A'
  title       text not null,              -- 'PEITO E TRÍCEPS'
  notes       text,
  sort_order  int not null default 0,
  created_at  timestamptz not null default now(),
  unique (plan_id, label)
);

-- ─── exercises ──────────────────────────────────────────────────────────────
create table public.exercises (
  id            uuid primary key default gen_random_uuid(),
  day_id        uuid not null references public.training_days (id) on delete cascade,
  name          text not null,
  muscle_group  text,
  media_url     text,
  sets          int not null default 3 check (sets between 1 and 20),
  reps          text not null default '10',   -- '8-12', 'até a falha'
  load_kg       numeric(6,2) check (load_kg >= 0),
  rest_seconds  int not null default 60 check (rest_seconds between 0 and 900),
  notes         text,
  sort_order    int not null default 0,
  created_at    timestamptz not null default now()
);

create index exercises_day_idx on public.exercises (day_id, sort_order);

-- ─── exercise_logs · execução registrada pelo aluno ─────────────────────────
create table public.exercise_logs (
  id            uuid primary key default gen_random_uuid(),
  student_id    uuid not null references public.students (id) on delete cascade,
  exercise_id   uuid not null references public.exercises (id) on delete cascade,
  day_id        uuid references public.training_days (id) on delete set null,
  performed_at  timestamptz not null default now(),
  set_number    int not null check (set_number between 1 and 20),
  reps_done     int check (reps_done >= 0),
  load_kg       numeric(6,2) check (load_kg >= 0),
  notes         text,
  created_at    timestamptz not null default now()
);

create index exercise_logs_student_idx on public.exercise_logs (student_id, performed_at desc);
create index exercise_logs_exercise_idx on public.exercise_logs (exercise_id, performed_at desc);

-- ─── physical_assessments ───────────────────────────────────────────────────
create table public.physical_assessments (
  id             uuid primary key default gen_random_uuid(),
  student_id     uuid not null references public.students (id) on delete cascade,
  assessed_on    date not null default current_date,
  weight_kg      numeric(5,2) check (weight_kg > 0),
  height_cm      numeric(5,2) check (height_cm > 0),
  body_fat_pct   numeric(4,1) check (body_fat_pct between 0 and 70),
  lean_mass_kg   numeric(5,2) check (lean_mass_kg >= 0),
  resting_hr     int check (resting_hr between 20 and 240),
  notes          text,
  created_at     timestamptz not null default now()
);

create index physical_assessments_student_idx
  on public.physical_assessments (student_id, assessed_on desc);

-- ─── body_measurements ──────────────────────────────────────────────────────
create table public.body_measurements (
  id            uuid primary key default gen_random_uuid(),
  assessment_id uuid not null references public.physical_assessments (id) on delete cascade,
  site          text not null,            -- 'braço direito', 'cintura', ...
  value_cm      numeric(5,2) not null check (value_cm > 0),
  unique (assessment_id, site)
);

-- ─── progress_photos ────────────────────────────────────────────────────────
create table public.progress_photos (
  id            uuid primary key default gen_random_uuid(),
  student_id    uuid not null references public.students (id) on delete cascade,
  assessment_id uuid references public.physical_assessments (id) on delete set null,
  storage_path  text not null,            -- bucket privado 'progress-photos'
  angle         text,                     -- 'frente', 'lado', 'costas'
  taken_on      date not null default current_date,
  created_at    timestamptz not null default now()
);

create index progress_photos_student_idx on public.progress_photos (student_id, taken_on desc);

-- ─── subscriptions · planos/mensalidades contratadas ────────────────────────
create table public.subscriptions (
  id          uuid primary key default gen_random_uuid(),
  student_id  uuid not null references public.students (id) on delete cascade,
  plan_name   text not null,
  amount      numeric(10,2) not null check (amount >= 0),
  due_day     int not null default 10 check (due_day between 1 and 31),
  starts_on   date not null default current_date,
  ends_on     date,
  active      boolean not null default true,
  created_at  timestamptz not null default now()
);

create index subscriptions_student_idx on public.subscriptions (student_id) where active;

-- ─── payments ───────────────────────────────────────────────────────────────
create table public.payments (
  id              uuid primary key default gen_random_uuid(),
  student_id      uuid not null references public.students (id) on delete cascade,
  subscription_id uuid references public.subscriptions (id) on delete set null,
  reference_month  date not null,           -- sempre o dia 1 do mês de competência
  amount          numeric(10,2) not null check (amount >= 0),
  due_date        date not null,
  status          payment_status not null default 'pending',
  paid_at         timestamptz,              -- preenchido só com confirmação real
  method          text,
  notes           text,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now(),
  -- um pagamento só é 'paid' quando há data de confirmação
  constraint payments_paid_requires_date check (
    (status = 'paid' and paid_at is not null) or (status <> 'paid')
  ),
  unique (student_id, reference_month, subscription_id)
);

create index payments_status_idx on public.payments (status, due_date);
create index payments_month_idx on public.payments (reference_month);

-- ─── expenses ───────────────────────────────────────────────────────────────
create table public.expenses (
  id          uuid primary key default gen_random_uuid(),
  description text not null,
  category    text not null default 'operacional',
  amount      numeric(10,2) not null check (amount >= 0),
  spent_on    date not null default current_date,
  notes       text,
  created_at  timestamptz not null default now()
);

create index expenses_date_idx on public.expenses (spent_on desc);

-- ─── notifications ──────────────────────────────────────────────────────────
create table public.notifications (
  id          uuid primary key default gen_random_uuid(),
  profile_id  uuid not null references public.profiles (id) on delete cascade,
  kind        notification_kind not null default 'announcement',
  title       text not null,
  body        text,
  link        text,
  channel     delivery_channel not null default 'in_app',
  -- 'skipped' quando a integração externa não está configurada
  delivery    delivery_status not null default 'pending',
  delivery_error text,
  read_at     timestamptz,
  created_at  timestamptz not null default now()
);

create index notifications_profile_idx on public.notifications (profile_id, created_at desc);

-- ─── messages · avisos do personal para os alunos ───────────────────────────
create table public.messages (
  id          uuid primary key default gen_random_uuid(),
  author_id   uuid not null references public.profiles (id) on delete cascade,
  student_id  uuid references public.students (id) on delete cascade, -- null = aviso geral
  subject     text,
  body        text not null,
  created_at  timestamptz not null default now()
);

create index messages_student_idx on public.messages (student_id, created_at desc);

-- ─── testimonials ───────────────────────────────────────────────────────────
create table public.testimonials (
  id            uuid primary key default gen_random_uuid(),
  student_id    uuid references public.students (id) on delete set null,
  author_name   text not null,
  author_role   text,
  content       text not null,
  published     boolean not null default false,  -- só publica com autorização
  consent_at    timestamptz,
  sort_order    int not null default 0,
  created_at    timestamptz not null default now(),
  constraint testimonials_consent check (not published or consent_at is not null)
);

-- ─── updated_at automático ──────────────────────────────────────────────────
create or replace function public.touch_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

do $$
declare t text;
begin
  foreach t in array array[
    'profiles', 'personal_settings', 'students', 'appointments',
    'training_plans', 'payments'
  ]
  loop
    execute format(
      'create trigger %I_touch before update on public.%I
         for each row execute function public.touch_updated_at()',
      t, t
    );
  end loop;
end $$;
