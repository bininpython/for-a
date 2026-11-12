import Link from 'next/link';
import {
  ArrowRight,
  Bell,
  CalendarCheck,
  CalendarPlus,
  ClipboardList,
  CreditCard,
  Dumbbell,
  Percent,
} from 'lucide-react';
import { Avatar } from '@/components/ui/Avatar';
import { Badge } from '@/components/ui/Badge';
import { StatCard } from '@/components/ui/StatCard';
import { EmptyState } from '@/components/ui/EmptyState';
import { requireStudent } from '@/lib/auth';
import { createClient } from '@/lib/supabase/server';
import { APPOINTMENT_STATUS, PAYMENT_STATUS } from '@/lib/labels';
import { formatCurrency, formatDate, formatDateTime, formatTime, monthStartISO } from '@/lib/utils';

export const dynamic = 'force-dynamic';

export default async function StudentHomePage() {
  const { student, profile } = await requireStudent();
  const supabase = createClient();
  const monthStart = monthStartISO();

  const [next, plan, monthAppointments, payment, messages] = await Promise.all([
    supabase
      .from('appointments')
      .select('*, services(name)')
      .eq('student_id', student.id)
      .in('status', ['requested', 'confirmed'])
      .gte('starts_at', new Date().toISOString())
      .order('starts_at')
      .limit(3),
    supabase
      .from('training_plans')
      .select('*, training_days(id, label, title, exercises(id))')
      .eq('student_id', student.id)
      .eq('published', true)
      .order('updated_at', { ascending: false })
      .limit(1)
      .maybeSingle(),
    supabase
      .from('appointments')
      .select('status')
      .eq('student_id', student.id)
      .gte('starts_at', `${monthStart}T00:00:00-03:00`),
    supabase
      .from('payments')
      .select('*')
      .eq('student_id', student.id)
      .in('status', ['pending', 'overdue'])
      .order('due_date')
      .limit(1)
      .maybeSingle(),
    supabase
      .from('messages')
      .select('*')
      .or(`student_id.is.null,student_id.eq.${student.id}`)
      .order('created_at', { ascending: false })
      .limit(3),
  ]);

  const appointments = monthAppointments.data ?? [];
  const completed = appointments.filter((a) => a.status === 'completed').length;
  const noShows = appointments.filter((a) => a.status === 'no_show').length;
  const attendance =
    completed + noShows > 0 ? Math.round((completed / (completed + noShows)) * 100) : null;

  const upcoming = next.data ?? [];
  const days = (plan.data?.training_days ?? []) as unknown as {
    id: string;
    label: string;
    title: string;
    exercises: { id: string }[];
  }[];

  const hour = Number(
    new Intl.DateTimeFormat('pt-BR', {
      hour: 'numeric',
      hour12: false,
      timeZone: 'America/Sao_Paulo',
    }).format(new Date()),
  );
  const greeting = hour < 12 ? 'Bom dia' : hour < 18 ? 'Boa tarde' : 'Boa noite';
  const firstName = student.full_name.split(' ')[0];

  return (
    <>
      {/* ─── Saudação ───────────────────────────────────────────────────── */}
      <header className="mb-8 flex items-center gap-4">
        <Avatar name={student.full_name} src={student.photo_url} size={60} />
        <div className="min-w-0">
          <p className="text-sm text-hpe-muted">{greeting},</p>
          <h1 className="hpe-display truncate text-2xl sm:text-3xl">{firstName}</h1>
        </div>
      </header>

      {/* ─── Próximo treino ─────────────────────────────────────────────── */}
      <section className="mb-6">
        {upcoming.length === 0 ? (
          <div className="hpe-card flex flex-col items-start gap-4 p-5 sm:flex-row sm:items-center sm:p-6">
            <span className="inline-flex h-12 w-12 shrink-0 items-center justify-center rounded-xl border border-white/10 bg-white/[0.03]">
              <CalendarPlus className="h-5 w-5 text-hpe-muted" />
            </span>
            <div className="min-w-0 flex-1">
              <p className="font-display text-base font-bold uppercase tracking-wide">
                Nenhum treino agendado
              </p>
              <p className="mt-1 text-sm text-hpe-muted">
                Escolha um horário livre e mantenha a constância.
              </p>
            </div>
            <Link href="/agendar" className="hpe-btn-primary hpe-btn-sm">
              Agendar treino
            </Link>
          </div>
        ) : (
          <div className="hpe-card relative overflow-hidden p-5 sm:p-6">
            <div
              className="absolute inset-0 bg-gradient-to-r from-hpe-orange/[0.09] to-transparent"
              aria-hidden
            />
            <div className="relative">
              <p className="hpe-eyebrow">Próximo treino</p>
              <div className="mt-3 flex flex-wrap items-end gap-x-4 gap-y-2">
                <p className="hpe-display text-3xl sm:text-4xl">
                  {formatTime(upcoming[0].starts_at)}
                </p>
                <p className="pb-1 text-sm text-hpe-muted">
                  {formatDate(upcoming[0].starts_at, {
                    weekday: 'long',
                    day: '2-digit',
                    month: 'long',
                  })}
                </p>
                <Badge
                  className="mb-1"
                  tone={APPOINTMENT_STATUS[upcoming[0].status].tone}
                  dot
                >
                  {APPOINTMENT_STATUS[upcoming[0].status].label}
                </Badge>
              </div>
              <p className="mt-2 text-sm text-hpe-muted">
                {(upcoming[0].services as unknown as { name: string } | null)?.name ??
                  'Treino'}
              </p>

              <div className="mt-5 flex flex-wrap gap-2.5">
                <Link href="/aluno/treino" className="hpe-btn-primary hpe-btn-sm">
                  <Dumbbell className="h-4 w-4" />
                  Iniciar treino
                </Link>
                <Link href="/aluno/agendamentos" className="hpe-btn-ghost hpe-btn-sm">
                  Meus agendamentos
                </Link>
              </div>
            </div>
          </div>
        )}
      </section>

      {/* ─── Indicadores ────────────────────────────────────────────────── */}
      <section className="mb-6 grid gap-4 sm:grid-cols-3">
        <StatCard
          label="Treinos no mês"
          value={completed}
          icon={CalendarCheck}
          tone="orange"
          hint={`${appointments.length} agendado(s)`}
        />
        <StatCard
          label="Frequência"
          value={attendance === null ? '—' : `${attendance}%`}
          icon={Percent}
          hint={noShows > 0 ? `${noShows} falta(s) no mês` : 'Nenhuma falta no mês'}
        />
        <StatCard
          label="Mensalidade"
          value={
            payment.data
              ? PAYMENT_STATUS[payment.data.status].label
              : 'Em dia'
          }
          icon={CreditCard}
          tone={payment.data ? 'danger' : 'success'}
          hint={
            payment.data
              ? `${formatCurrency(Number(payment.data.amount))} · vence ${formatDate(payment.data.due_date)}`
              : 'Sem pendências'
          }
        />
      </section>

      {/* ─── Ficha atual ────────────────────────────────────────────────── */}
      <section className="mb-6">
        <div className="mb-3 flex items-center justify-between gap-3">
          <h2 className="font-display text-base font-bold uppercase tracking-wide">
            Minha ficha
          </h2>
          {plan.data ? (
            <Link
              href="/aluno/ficha"
              className="inline-flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-hpe-orange hover:text-hpe-orange-2"
            >
              Ver completa
              <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          ) : null}
        </div>

        {!plan.data ? (
          <EmptyState
            icon={ClipboardList}
            title="Nenhuma ficha publicada"
            description="Assim que o Patrick publicar sua ficha de treino, ela aparece aqui."
          />
        ) : (
          <div className="hpe-card p-5">
            <p className="font-display text-base font-bold uppercase tracking-wide">
              {plan.data.name}
            </p>
            {plan.data.goal ? (
              <p className="mt-1 text-sm text-hpe-muted">{plan.data.goal}</p>
            ) : null}

            <div className="mt-4 grid gap-2.5 sm:grid-cols-2">
              {days
                .sort((a, b) => a.label.localeCompare(b.label))
                .map((day) => (
                  <Link
                    key={day.id}
                    href={`/aluno/treino?dia=${day.id}`}
                    className="flex items-center gap-3 rounded-xl border border-white/[0.07] bg-white/[0.02] p-3 transition-colors hover:border-hpe-orange/40"
                  >
                    <span className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-hpe-orange font-display font-extrabold text-hpe-black">
                      {day.label}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-medium">
                        {day.title}
                      </span>
                      <span className="block text-xs text-hpe-muted">
                        {day.exercises?.length ?? 0} exercício(s)
                      </span>
                    </span>
                    <ArrowRight className="h-4 w-4 shrink-0 text-hpe-muted" />
                  </Link>
                ))}
            </div>
          </div>
        )}
      </section>

      {/* ─── Avisos ─────────────────────────────────────────────────────── */}
      {messages.data?.length ? (
        <section>
          <h2 className="mb-3 flex items-center gap-2 font-display text-base font-bold uppercase tracking-wide">
            <Bell className="h-4 w-4 text-hpe-orange" />
            Avisos do personal
          </h2>
          <ul className="space-y-3">
            {messages.data.map((message) => (
              <li key={message.id} className="hpe-card p-4">
                <p className="text-sm font-medium">
                  {message.subject ?? 'Aviso do personal'}
                </p>
                <p className="mt-0.5 text-xs text-hpe-muted">
                  {formatDateTime(message.created_at)}
                </p>
                <p className="mt-2 whitespace-pre-wrap text-sm leading-relaxed text-hpe-white/90">
                  {message.body}
                </p>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      {upcoming.length > 1 ? (
        <section className="mt-6">
          <h2 className="mb-3 font-display text-base font-bold uppercase tracking-wide">
            Próximos treinos
          </h2>
          <ul className="space-y-2.5">
            {upcoming.slice(1).map((item) => (
              <li key={item.id} className="hpe-card flex items-center gap-4 p-4">
                <span className="font-display text-lg font-bold tabular-nums">
                  {formatTime(item.starts_at)}
                </span>
                <span className="min-w-0 flex-1 text-sm text-hpe-muted">
                  {formatDate(item.starts_at, {
                    weekday: 'short',
                    day: '2-digit',
                    month: 'short',
                  })}
                </span>
                <Badge tone={APPOINTMENT_STATUS[item.status].tone}>
                  {APPOINTMENT_STATUS[item.status].label}
                </Badge>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      <p className="mt-10 text-center text-xs text-white/25">
        {profile.email}
      </p>
    </>
  );
}
