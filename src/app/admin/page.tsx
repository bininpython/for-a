import Link from 'next/link';
import {
  AlertTriangle,
  CalendarCheck,
  CalendarDays,
  CircleDollarSign,
  Clock,
  Percent,
  TrendingUp,
  UserMinus,
  UserPlus,
  Users,
} from 'lucide-react';
import { PageHeader } from '@/components/dashboard/PageHeader';
import { StatCard } from '@/components/ui/StatCard';
import { Badge } from '@/components/ui/Badge';
import { Avatar } from '@/components/ui/Avatar';
import { EmptyState } from '@/components/ui/EmptyState';
import {
  OccupancyChart,
  RevenueChart,
  StudentsChart,
} from '@/components/charts/HpeCharts';
import { createClient } from '@/lib/supabase/server';
import type { AdminOverview } from '@/lib/supabase/database.types';
import { APPOINTMENT_STATUS } from '@/lib/labels';
import { formatCurrency, formatDateTime } from '@/lib/utils';

export const dynamic = 'force-dynamic';

export default async function AdminOverviewPage() {
  const supabase = createClient();

  // Marca como atrasadas as mensalidades vencidas antes de somar os números.
  await supabase.rpc('refresh_overdue_payments');

  const { data, error } = await supabase.rpc('admin_overview');

  if (error || !data) {
    return (
      <>
        <PageHeader title="Visão geral" />
        <EmptyState
          icon={AlertTriangle}
          title="Não foi possível carregar os indicadores"
          description="Verifique se as migrations de supabase/migrations foram aplicadas no projeto e se o seu perfil tem role = 'admin'."
        />
      </>
    );
  }

  const overview = data as unknown as AdminOverview;
  const netResult = overview.revenue_month - overview.expenses_month;

  return (
    <>
      <PageHeader
        title="Visão geral"
        description="Os números abaixo vêm diretamente do banco — nenhum valor é estimado."
        actions={
          <>
            <Link href="/admin/alunos/novo" className="hpe-btn-ghost hpe-btn-sm">
              <UserPlus className="h-4 w-4" />
              Novo aluno
            </Link>
            <Link href="/admin/agenda" className="hpe-btn-primary hpe-btn-sm">
              <CalendarDays className="h-4 w-4" />
              Abrir agenda
            </Link>
          </>
        }
      />

      {/* ─── Indicadores ────────────────────────────────────────────────── */}
      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="Alunos ativos"
          value={overview.active_students}
          icon={Users}
          tone="orange"
          hint={`${overview.inactive_students} inativos ou pausados`}
        />
        <StatCard
          label="Novos este mês"
          value={overview.new_students}
          icon={UserPlus}
          hint="Entradas no mês corrente"
        />
        <StatCard
          label="Treinos hoje"
          value={overview.sessions_today}
          icon={CalendarCheck}
          hint={
            overview.pending_requests > 0
              ? `${overview.pending_requests} pedido(s) aguardando confirmação`
              : 'Nenhum pedido pendente'
          }
          tone={overview.pending_requests > 0 ? 'orange' : 'default'}
        />
        <StatCard
          label="Taxa de frequência"
          value={
            overview.attendance_rate === null ? '—' : `${overview.attendance_rate}%`
          }
          icon={Percent}
          hint={
            overview.attendance_rate === null
              ? 'Ainda sem treinos concluídos no mês'
              : 'Concluídos ÷ (concluídos + faltas)'
          }
        />
      </section>

      <section className="mt-4 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="Faturamento do mês"
          value={formatCurrency(overview.revenue_month)}
          icon={CircleDollarSign}
          tone="success"
          hint="Somente pagamentos confirmados"
        />
        <StatCard
          label="Mensalidades pendentes"
          value={formatCurrency(overview.pending_amount)}
          icon={Clock}
          tone={overview.pending_amount > 0 ? 'orange' : 'default'}
          hint={`${overview.overdue_count} em atraso`}
        />
        <StatCard
          label="Despesas do mês"
          value={formatCurrency(overview.expenses_month)}
          icon={UserMinus}
        />
        <StatCard
          label="Resultado líquido"
          value={formatCurrency(netResult)}
          icon={TrendingUp}
          tone={netResult >= 0 ? 'success' : 'danger'}
          hint="Faturamento − despesas do mês"
        />
      </section>

      {/* ─── Gráficos ───────────────────────────────────────────────────── */}
      <section className="mt-8 grid gap-5 xl:grid-cols-2">
        <div className="hpe-card p-5 sm:p-6">
          <h2 className="font-display text-base font-bold uppercase tracking-wide">
            Movimento financeiro
          </h2>
          <p className="mb-5 mt-1 text-xs text-hpe-muted">Últimos 6 meses</p>
          <RevenueChart data={overview.revenue_series} />
        </div>

        <div className="hpe-card p-5 sm:p-6">
          <h2 className="font-display text-base font-bold uppercase tracking-wide">
            Evolução de alunos
          </h2>
          <p className="mb-5 mt-1 text-xs text-hpe-muted">
            Alunos ativos ao fim de cada mês
          </p>
          <StudentsChart data={overview.students_growth} />
        </div>
      </section>

      <section className="mt-5 grid gap-5 xl:grid-cols-[1fr_minmax(0,420px)]">
        <div className="hpe-card p-5 sm:p-6">
          <h2 className="font-display text-base font-bold uppercase tracking-wide">
            Ocupação da agenda
          </h2>
          <p className="mb-5 mt-1 text-xs text-hpe-muted">Próximos 14 dias</p>
          <OccupancyChart data={overview.occupancy} />
        </div>

        {/* ─── Próximos atendimentos ───────────────────────────────────── */}
        <div className="hpe-card flex flex-col p-5 sm:p-6">
          <div className="mb-5 flex items-center justify-between gap-3">
            <h2 className="font-display text-base font-bold uppercase tracking-wide">
              Próximos atendimentos
            </h2>
            <Link
              href="/admin/agenda"
              className="text-xs font-semibold uppercase tracking-wider text-hpe-orange hover:text-hpe-orange-2"
            >
              Ver agenda
            </Link>
          </div>

          {overview.next_appointments.length === 0 ? (
            <EmptyState
              icon={CalendarDays}
              title="Agenda livre"
              description="Nenhum atendimento confirmado ou solicitado à frente."
              className="flex-1 border-0 py-8"
            />
          ) : (
            <ul className="flex-1 space-y-2.5">
              {overview.next_appointments.map((item) => {
                const status = APPOINTMENT_STATUS[item.status];
                return (
                  <li
                    key={item.id}
                    className="flex items-center gap-3 rounded-xl border border-white/[0.06] bg-white/[0.02] p-3"
                  >
                    <Avatar
                      name={item.student_name}
                      src={item.student_photo}
                      size={38}
                    />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium">
                        {item.student_name}
                      </p>
                      <p className="truncate text-xs text-hpe-muted">
                        {formatDateTime(item.starts_at)}
                        {item.service_name ? ` · ${item.service_name}` : ''}
                      </p>
                    </div>
                    <Badge tone={status.tone}>{status.label}</Badge>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </section>
    </>
  );
}
