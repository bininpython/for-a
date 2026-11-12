import Link from 'next/link';
import { notFound } from 'next/navigation';
import {
  ArrowLeft,
  CalendarDays,
  ClipboardList,
  CreditCard,
  Pencil,
  Ruler,
  StickyNote,
  User,
} from 'lucide-react';
import { Avatar } from '@/components/ui/Avatar';
import { Badge } from '@/components/ui/Badge';
import { EmptyState } from '@/components/ui/EmptyState';
import { StatCard } from '@/components/ui/StatCard';
import { StudentActions } from './StudentActions';
import { createClient } from '@/lib/supabase/server';
import { APPOINTMENT_STATUS, CONTRACT_STATUS, PAYMENT_STATUS, TRAINING_LEVEL } from '@/lib/labels';
import {
  age,
  cn,
  formatCurrency,
  formatDate,
  formatDateTime,
  formatPhone,
  whatsappLink,
} from '@/lib/utils';

export const dynamic = 'force-dynamic';

const TABS = [
  { value: 'dados', label: 'Dados pessoais', icon: User },
  { value: 'treinos', label: 'Treinamentos', icon: ClipboardList },
  { value: 'avaliacoes', label: 'Avaliações', icon: Ruler },
  { value: 'frequencia', label: 'Frequência', icon: CalendarDays },
  { value: 'financeiro', label: 'Financeiro', icon: CreditCard },
  { value: 'observacoes', label: 'Observações', icon: StickyNote },
] as const;

export default async function StudentProfilePage({
  params,
  searchParams,
}: {
  params: { id: string };
  searchParams: { aba?: string };
}) {
  const supabase = createClient();
  const tab = TABS.find((t) => t.value === searchParams.aba)?.value ?? 'dados';

  const { data: student } = await supabase
    .from('students')
    .select('*')
    .eq('id', params.id)
    .maybeSingle();

  if (!student) notFound();

  const [plans, assessments, appointments, payments] = await Promise.all([
    supabase
      .from('training_plans')
      .select('*, training_days(id, label, title, exercises(id))')
      .eq('student_id', student.id)
      .order('created_at', { ascending: false }),
    supabase
      .from('physical_assessments')
      .select('*, body_measurements(site, value_cm)')
      .eq('student_id', student.id)
      .order('assessed_on', { ascending: false }),
    supabase
      .from('appointments')
      .select('*, services(name)')
      .eq('student_id', student.id)
      .order('starts_at', { ascending: false })
      .limit(60),
    supabase
      .from('payments')
      .select('*')
      .eq('student_id', student.id)
      .order('reference_month', { ascending: false }),
  ]);

  const appointmentList = appointments.data ?? [];
  const completed = appointmentList.filter((a) => a.status === 'completed').length;
  const noShows = appointmentList.filter((a) => a.status === 'no_show').length;
  const cancelled = appointmentList.filter((a) => a.status === 'cancelled').length;
  const attendanceRate =
    completed + noShows > 0 ? Math.round((completed / (completed + noShows)) * 100) : null;

  const paymentList = payments.data ?? [];
  const pendingTotal = paymentList
    .filter((p) => p.status === 'pending' || p.status === 'overdue')
    .reduce((sum, p) => sum + Number(p.amount), 0);

  const status = CONTRACT_STATUS[student.contract_status];
  const wa = whatsappLink(student.phone);

  return (
    <>
      <Link
        href="/admin/alunos"
        className="mb-6 inline-flex items-center gap-2 text-sm text-hpe-muted transition-colors hover:text-hpe-white"
      >
        <ArrowLeft className="h-4 w-4" />
        Voltar para alunos
      </Link>

      {/* ─── Cabeçalho do aluno ─────────────────────────────────────────── */}
      <header className="hpe-card mb-6 p-5 sm:p-6">
        <div className="flex flex-col gap-5 sm:flex-row sm:items-start">
          <Avatar name={student.full_name} src={student.photo_url} size={76} />

          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-3">
              <h1 className="hpe-display text-2xl">{student.full_name}</h1>
              <Badge tone={status.tone} dot>
                {status.label}
              </Badge>
              {!student.profile_id ? <Badge tone="gray">Sem acesso</Badge> : null}
            </div>

            <p className="mt-2 text-sm text-hpe-muted">
              {[
                student.main_goal,
                TRAINING_LEVEL[student.training_level],
                age(student.birth_date) ? `${age(student.birth_date)} anos` : null,
                `Desde ${formatDate(student.joined_at)}`,
              ]
                .filter(Boolean)
                .join(' · ')}
            </p>

            <div className="mt-4 flex flex-wrap gap-2.5">
              <Link
                href={`/admin/alunos/${student.id}/editar`}
                className="hpe-btn-ghost hpe-btn-sm"
              >
                <Pencil className="h-4 w-4" />
                Editar cadastro
              </Link>
              <Link
                href={`/admin/fichas/nova?aluno=${student.id}`}
                className="hpe-btn-ghost hpe-btn-sm"
              >
                <ClipboardList className="h-4 w-4" />
                Nova ficha
              </Link>
              {wa ? (
                <a
                  href={wa}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="hpe-btn-subtle hpe-btn-sm"
                >
                  WhatsApp
                </a>
              ) : null}
              <StudentActions
                studentId={student.id}
                status={student.contract_status}
                hasAccess={Boolean(student.profile_id)}
                hasEmail={Boolean(student.email)}
              />
            </div>
          </div>
        </div>
      </header>

      {/* ─── Abas ───────────────────────────────────────────────────────── */}
      <nav className="no-scrollbar mb-6 flex gap-2 overflow-x-auto border-b border-white/[0.07]">
        {TABS.map((item) => {
          const active = tab === item.value;
          return (
            <Link
              key={item.value}
              href={`/admin/alunos/${student.id}?aba=${item.value}`}
              className={cn(
                'inline-flex items-center gap-2 whitespace-nowrap border-b-2 px-4 py-3 text-sm font-medium transition-colors',
                active
                  ? 'border-hpe-orange text-hpe-orange'
                  : 'border-transparent text-hpe-muted hover:text-hpe-white',
              )}
            >
              <item.icon className="h-4 w-4" />
              {item.label}
            </Link>
          );
        })}
      </nav>

      {/* ─── Dados pessoais ─────────────────────────────────────────────── */}
      {tab === 'dados' ? (
        <div className="grid gap-5 lg:grid-cols-2">
          <section className="hpe-card p-5 sm:p-6">
            <h2 className="hpe-display text-base">Informações cadastrais</h2>
            <dl className="mt-5 space-y-3.5 text-sm">
              <Row label="Telefone" value={formatPhone(student.phone)} />
              <Row label="E-mail" value={student.email ?? '—'} />
              <Row label="Nascimento" value={formatDate(student.birth_date)} />
              <Row label="CPF" value={student.cpf ?? '—'} />
              <Row label="Entrada" value={formatDate(student.joined_at)} />
              <Row
                label="Emergência"
                value={
                  student.emergency_contact_name
                    ? `${student.emergency_contact_name} · ${formatPhone(student.emergency_contact_phone)}`
                    : '—'
                }
              />
            </dl>
          </section>

          <section className="hpe-card p-5 sm:p-6">
            <h2 className="hpe-display text-base">Objetivos e contrato</h2>
            <dl className="mt-5 space-y-3.5 text-sm">
              <Row label="Objetivo" value={student.main_goal ?? '—'} />
              <Row label="Nível" value={TRAINING_LEVEL[student.training_level]} />
              <Row label="Plano" value={student.plan_name ?? '—'} />
              <Row label="Mensalidade" value={formatCurrency(student.monthly_fee)} />
              <Row
                label="Vencimento"
                value={student.due_day ? `Dia ${student.due_day}` : '—'}
              />
              <Row label="Situação" value={status.label} />
            </dl>
          </section>

          <section className="hpe-card p-5 sm:p-6 lg:col-span-2">
            <h2 className="hpe-display text-base">Consentimentos (LGPD)</h2>
            <dl className="mt-5 space-y-3.5 text-sm">
              <Row
                label="Tratamento de dados"
                value={
                  student.lgpd_consent_at
                    ? `Autorizado em ${formatDate(student.lgpd_consent_at)}`
                    : 'Não registrado'
                }
              />
              <Row
                label="Fotografias de evolução"
                value={student.photo_consent ? 'Autorizado' : 'Não autorizado'}
              />
            </dl>
          </section>
        </div>
      ) : null}

      {/* ─── Treinamentos ───────────────────────────────────────────────── */}
      {tab === 'treinos' ? (
        plans.data?.length ? (
          <div className="grid gap-4 md:grid-cols-2">
            {plans.data.map((plan) => {
              const days = (plan.training_days ?? []) as {
                id: string;
                label: string;
                title: string;
                exercises: { id: string }[];
              }[];
              const exerciseCount = days.reduce(
                (sum, day) => sum + (day.exercises?.length ?? 0),
                0,
              );
              return (
                <Link
                  key={plan.id}
                  href={`/admin/fichas/${plan.id}`}
                  className="hpe-card hpe-card-hover p-5"
                >
                  <div className="flex items-start justify-between gap-3">
                    <h3 className="font-display text-base font-bold uppercase tracking-wide">
                      {plan.name}
                    </h3>
                    <Badge tone={plan.published ? 'green' : 'gray'}>
                      {plan.published ? 'Publicada' : 'Rascunho'}
                    </Badge>
                  </div>
                  {plan.goal ? (
                    <p className="mt-2 text-sm text-hpe-muted">{plan.goal}</p>
                  ) : null}
                  <p className="mt-4 text-xs text-hpe-muted">
                    {plan.split ?? 'Personalizada'} · {days.length} dia(s) ·{' '}
                    {exerciseCount} exercício(s)
                  </p>
                  <p className="mt-1 text-xs text-white/30">
                    Criada em {formatDate(plan.created_at)}
                  </p>
                </Link>
              );
            })}
          </div>
        ) : (
          <EmptyState
            icon={ClipboardList}
            title="Nenhuma ficha montada"
            description="Monte a primeira ficha de treino deste aluno."
            action={
              <Link
                href={`/admin/fichas/nova?aluno=${student.id}`}
                className="hpe-btn-primary hpe-btn-sm"
              >
                Criar ficha
              </Link>
            }
          />
        )
      ) : null}

      {/* ─── Avaliações ─────────────────────────────────────────────────── */}
      {tab === 'avaliacoes' ? (
        assessments.data?.length ? (
          <div className="space-y-4">
            {assessments.data.map((assessment) => {
              const measurements = (assessment.body_measurements ?? []) as {
                site: string;
                value_cm: number;
              }[];
              return (
                <article key={assessment.id} className="hpe-card p-5 sm:p-6">
                  <div className="flex flex-wrap items-baseline justify-between gap-3">
                    <h3 className="font-display text-base font-bold uppercase tracking-wide">
                      {formatDate(assessment.assessed_on, {
                        day: '2-digit',
                        month: 'long',
                        year: 'numeric',
                      })}
                    </h3>
                  </div>

                  <div className="mt-4 grid gap-3 sm:grid-cols-3 lg:grid-cols-5">
                    <Metric label="Peso" value={assessment.weight_kg} unit=" kg" />
                    <Metric label="Altura" value={assessment.height_cm} unit=" cm" />
                    <Metric
                      label="% Gordura"
                      value={assessment.body_fat_pct}
                      unit="%"
                    />
                    <Metric
                      label="Massa magra"
                      value={assessment.lean_mass_kg}
                      unit=" kg"
                    />
                    <Metric
                      label="FC repouso"
                      value={assessment.resting_hr}
                      unit=" bpm"
                    />
                  </div>

                  {measurements.length ? (
                    <div className="mt-5 border-t border-white/[0.06] pt-4">
                      <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-hpe-muted">
                        Medidas corporais
                      </p>
                      <div className="flex flex-wrap gap-2">
                        {measurements.map((m) => (
                          <span
                            key={m.site}
                            className="rounded-lg border border-white/10 bg-white/[0.02] px-3 py-1.5 text-xs"
                          >
                            {m.site}:{' '}
                            <strong className="tabular-nums">{m.value_cm} cm</strong>
                          </span>
                        ))}
                      </div>
                    </div>
                  ) : null}

                  {assessment.notes ? (
                    <p className="mt-4 border-t border-white/[0.06] pt-4 text-sm leading-relaxed text-hpe-muted">
                      {assessment.notes}
                    </p>
                  ) : null}
                </article>
              );
            })}
          </div>
        ) : (
          <EmptyState
            icon={Ruler}
            title="Nenhuma avaliação registrada"
            description="As avaliações físicas alimentam os gráficos de evolução do aluno."
            action={
              <Link
                href={`/admin/avaliacoes?aluno=${student.id}`}
                className="hpe-btn-primary hpe-btn-sm"
              >
                Registrar avaliação
              </Link>
            }
          />
        )
      ) : null}

      {/* ─── Frequência ─────────────────────────────────────────────────── */}
      {tab === 'frequencia' ? (
        <>
          <div className="mb-5 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <StatCard label="Treinos realizados" value={completed} tone="success" />
            <StatCard label="Faltas" value={noShows} tone={noShows > 0 ? 'danger' : 'default'} />
            <StatCard label="Cancelamentos" value={cancelled} />
            <StatCard
              label="Taxa de presença"
              value={attendanceRate === null ? '—' : `${attendanceRate}%`}
              tone="orange"
            />
          </div>

          {appointmentList.length === 0 ? (
            <EmptyState
              icon={CalendarDays}
              title="Nenhum atendimento registrado"
              description="Os treinos agendados por você ou pelo aluno aparecem aqui."
            />
          ) : (
            <div className="hpe-card overflow-hidden">
              <div className="overflow-x-auto">
                <table className="hpe-table">
                  <thead>
                    <tr>
                      <th>Data</th>
                      <th>Treino</th>
                      <th>Status</th>
                      <th>Observação</th>
                    </tr>
                  </thead>
                  <tbody>
                    {appointmentList.map((item) => {
                      const meta = APPOINTMENT_STATUS[item.status];
                      const service = item.services as { name: string } | null;
                      return (
                        <tr key={item.id}>
                          <td className="whitespace-nowrap tabular-nums">
                            {formatDateTime(item.starts_at)}
                          </td>
                          <td className="text-sm text-hpe-muted">
                            {service?.name ?? '—'}
                          </td>
                          <td>
                            <Badge tone={meta.tone}>{meta.label}</Badge>
                          </td>
                          <td className="max-w-[20rem] truncate text-sm text-hpe-muted">
                            {item.notes ?? item.student_notes ?? '—'}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </>
      ) : null}

      {/* ─── Financeiro ─────────────────────────────────────────────────── */}
      {tab === 'financeiro' ? (
        <>
          <div className="mb-5 grid gap-4 sm:grid-cols-3">
            <StatCard
              label="Plano"
              value={student.plan_name ?? '—'}
              hint={formatCurrency(student.monthly_fee)}
            />
            <StatCard
              label="Vencimento"
              value={student.due_day ? `Dia ${student.due_day}` : '—'}
            />
            <StatCard
              label="Em aberto"
              value={formatCurrency(pendingTotal)}
              tone={pendingTotal > 0 ? 'danger' : 'success'}
            />
          </div>

          {paymentList.length === 0 ? (
            <EmptyState
              icon={CreditCard}
              title="Nenhuma mensalidade lançada"
              description="Lance as mensalidades deste aluno para acompanhar pagamentos e pendências."
              action={
                <Link
                  href={`/admin/mensalidades?aluno=${student.id}`}
                  className="hpe-btn-primary hpe-btn-sm"
                >
                  Lançar mensalidade
                </Link>
              }
            />
          ) : (
            <div className="hpe-card overflow-hidden">
              <div className="overflow-x-auto">
                <table className="hpe-table">
                  <thead>
                    <tr>
                      <th>Competência</th>
                      <th>Vencimento</th>
                      <th>Valor</th>
                      <th>Status</th>
                      <th>Pago em</th>
                    </tr>
                  </thead>
                  <tbody>
                    {paymentList.map((payment) => {
                      const meta = PAYMENT_STATUS[payment.status];
                      return (
                        <tr key={payment.id}>
                          <td className="tabular-nums">
                            {formatDate(payment.reference_month, {
                              month: '2-digit',
                              year: 'numeric',
                            })}
                          </td>
                          <td className="tabular-nums">{formatDate(payment.due_date)}</td>
                          <td className="font-medium tabular-nums">
                            {formatCurrency(Number(payment.amount))}
                          </td>
                          <td>
                            <Badge tone={meta.tone}>{meta.label}</Badge>
                          </td>
                          <td className="tabular-nums text-hpe-muted">
                            {payment.paid_at ? formatDate(payment.paid_at) : '—'}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </>
      ) : null}

      {/* ─── Observações ────────────────────────────────────────────────── */}
      {tab === 'observacoes' ? (
        <section className="hpe-card p-5 sm:p-6">
          <h2 className="hpe-display text-base">Anotações privadas</h2>
          <p className="mt-1 text-xs text-hpe-muted">
            Visível apenas para você. O aluno não tem acesso a este conteúdo.
          </p>
          {student.notes ? (
            <div className="mt-5 whitespace-pre-wrap text-sm leading-relaxed text-hpe-white/90">
              {student.notes}
            </div>
          ) : (
            <p className="mt-5 text-sm text-hpe-muted">
              Nenhuma anotação registrada.{' '}
              <Link
                href={`/admin/alunos/${student.id}/editar`}
                className="text-hpe-orange hover:underline"
              >
                Adicionar
              </Link>
              .
            </p>
          )}
        </section>
      ) : null}
    </>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-baseline justify-between gap-4 border-b border-white/[0.05] pb-3 last:border-0 last:pb-0">
      <dt className="text-xs font-semibold uppercase tracking-wider text-hpe-muted">
        {label}
      </dt>
      <dd className="text-right">{value}</dd>
    </div>
  );
}

function Metric({
  label,
  value,
  unit,
}: {
  label: string;
  value: number | null;
  unit: string;
}) {
  return (
    <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-3">
      <p className="text-[10px] font-semibold uppercase tracking-wider text-hpe-muted">
        {label}
      </p>
      <p className="mt-1 font-display text-lg font-bold tabular-nums">
        {value === null ? '—' : `${value}${unit}`}
      </p>
    </div>
  );
}
