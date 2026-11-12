import Link from 'next/link';
import {
  AlertCircle,
  ArrowDownRight,
  ArrowUpRight,
  Receipt,
  TrendingUp,
  Wallet,
} from 'lucide-react';
import { PageHeader } from '@/components/dashboard/PageHeader';
import { StatCard } from '@/components/ui/StatCard';
import { RevenueChart } from '@/components/charts/HpeCharts';
import { ExpensesClient } from './ExpensesClient';
import { createClient } from '@/lib/supabase/server';
import type { AdminOverview } from '@/lib/supabase/database.types';
import { cn, formatCurrency, monthStartISO, todayISO } from '@/lib/utils';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Financeiro' };

export default async function FinancePage({
  searchParams,
}: {
  searchParams: { mes?: string };
}) {
  const supabase = createClient();
  await supabase.rpc('refresh_overdue_payments');

  const month = searchParams.mes ?? todayISO().slice(0, 7);
  const monthStart = `${month}-01`;
  const [year, monthNumber] = month.split('-').map(Number);
  const monthEnd = new Date(year, monthNumber, 0).toISOString().slice(0, 10);

  const [overviewResult, paymentsResult, expensesResult] = await Promise.all([
    supabase.rpc('admin_overview'),
    supabase
      .from('payments')
      .select('amount, status')
      .eq('reference_month', monthStart),
    supabase
      .from('expenses')
      .select('*')
      .gte('spent_on', monthStart)
      .lte('spent_on', monthEnd)
      .order('spent_on', { ascending: false }),
  ]);

  const overview = overviewResult.data as unknown as AdminOverview | null;
  const payments = paymentsResult.data ?? [];
  const expenses = expensesResult.data ?? [];

  const sum = (status: string[]) =>
    payments
      .filter((p) => status.includes(p.status))
      .reduce((total, p) => total + Number(p.amount), 0);

  const received = sum(['paid']);
  const pending = sum(['pending']);
  const overdue = sum(['overdue']);
  const expensesTotal = expenses.reduce((total, e) => total + Number(e.amount), 0);
  const net = received - expensesTotal;
  const forecast = received + pending + overdue;
  const delinquencyRate = forecast > 0 ? Math.round((overdue / forecast) * 100) : 0;

  // Últimos 6 meses para o seletor de competência.
  const months = Array.from({ length: 6 }, (_, i) => {
    const date = new Date(year, monthNumber - 1 - i, 1);
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
  });

  return (
    <>
      <PageHeader
        title="Financeiro"
        description="Receitas confirmadas, pendências e despesas. Nada é marcado como recebido sem confirmação."
        actions={
          <Link href="/admin/mensalidades" className="hpe-btn-primary hpe-btn-sm">
            <Receipt className="h-4 w-4" />
            Mensalidades
          </Link>
        }
      />

      <nav className="no-scrollbar mb-6 flex gap-2 overflow-x-auto">
        {months.map((item) => (
          <Link
            key={item}
            href={{ pathname: '/admin/financeiro', query: { mes: item } }}
            className={cn(
              'whitespace-nowrap rounded-xl border px-3.5 py-2 text-sm font-medium tabular-nums transition-colors',
              item === month
                ? 'border-hpe-orange/50 bg-hpe-orange/10 text-hpe-orange'
                : 'border-white/10 text-hpe-muted hover:border-white/20 hover:text-hpe-white',
            )}
          >
            {new Intl.DateTimeFormat('pt-BR', { month: 'short', year: '2-digit' }).format(
              new Date(`${item}-01T12:00:00`),
            )}
          </Link>
        ))}
      </nav>

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="Recebido"
          value={formatCurrency(received)}
          icon={ArrowUpRight}
          tone="success"
          hint="Pagamentos confirmados na competência"
        />
        <StatCard
          label="A receber"
          value={formatCurrency(pending)}
          icon={Wallet}
          tone={pending > 0 ? 'orange' : 'default'}
          hint="Mensalidades pendentes dentro do prazo"
        />
        <StatCard
          label="Em atraso"
          value={formatCurrency(overdue)}
          icon={AlertCircle}
          tone={overdue > 0 ? 'danger' : 'default'}
          hint={`Inadimplência de ${delinquencyRate}% da previsão`}
        />
        <StatCard
          label="Despesas"
          value={formatCurrency(expensesTotal)}
          icon={ArrowDownRight}
          hint={`${expenses.length} lançamento(s)`}
        />
      </section>

      <section className="mt-4 grid gap-4 sm:grid-cols-2">
        <StatCard
          label="Resultado líquido"
          value={formatCurrency(net)}
          icon={TrendingUp}
          tone={net >= 0 ? 'success' : 'danger'}
          hint="Recebido − despesas do período"
        />
        <StatCard
          label="Previsão de receita"
          value={formatCurrency(forecast)}
          hint="Recebido + pendente + atrasado"
        />
      </section>

      {overview ? (
        <section className="mt-8 hpe-card p-5 sm:p-6">
          <h2 className="font-display text-base font-bold uppercase tracking-wide">
            Movimento dos últimos 6 meses
          </h2>
          <div className="mt-5">
            <RevenueChart data={overview.revenue_series} />
          </div>
        </section>
      ) : null}

      <section className="mt-8">
        <ExpensesClient expenses={expenses} />
      </section>

      <p className="mt-8 rounded-xl border border-white/10 bg-white/[0.02] px-4 py-3 text-xs leading-relaxed text-hpe-muted">
        A arquitetura está preparada para integração futura com Pix e gateways de
        pagamento: a tabela <code className="text-hpe-white">payments</code> já guarda
        método, data de confirmação e status. Enquanto não houver integração
        configurada, a baixa é sempre manual e exige confirmação real do recebimento.
      </p>
    </>
  );
}
