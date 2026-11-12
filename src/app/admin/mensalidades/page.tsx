import Link from 'next/link';
import { PageHeader } from '@/components/dashboard/PageHeader';
import { StatCard } from '@/components/ui/StatCard';
import { PaymentsClient, type PaymentRow } from './PaymentsClient';
import { createClient } from '@/lib/supabase/server';
import { cn, formatCurrency, todayISO } from '@/lib/utils';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Mensalidades' };

export default async function PaymentsPage({
  searchParams,
}: {
  searchParams: { mes?: string; aluno?: string; status?: string };
}) {
  const supabase = createClient();
  await supabase.rpc('refresh_overdue_payments');

  const month = searchParams.mes ?? todayISO().slice(0, 7);

  let query = supabase
    .from('payments')
    .select('*, students(id, full_name)')
    .eq('reference_month', `${month}-01`)
    .order('due_date');

  if (searchParams.aluno) query = query.eq('student_id', searchParams.aluno);

  const [paymentsResult, studentsResult] = await Promise.all([
    query,
    supabase
      .from('students')
      .select('id, full_name, monthly_fee, due_day')
      .in('contract_status', ['active', 'paused'])
      .order('full_name'),
  ]);

  const payments: PaymentRow[] = (paymentsResult.data ?? []).map((row) => {
    const student = row.students as unknown as { id: string; full_name: string } | null;
    return {
      id: row.id,
      student_id: row.student_id,
      student_name: student?.full_name ?? '—',
      reference_month: row.reference_month,
      amount: Number(row.amount),
      due_date: row.due_date,
      status: row.status,
      paid_at: row.paid_at,
      method: row.method,
      notes: row.notes,
    };
  });

  const total = payments.reduce((sum, p) => sum + p.amount, 0);
  const received = payments
    .filter((p) => p.status === 'paid')
    .reduce((sum, p) => sum + p.amount, 0);
  const open = payments
    .filter((p) => p.status === 'pending' || p.status === 'overdue')
    .reduce((sum, p) => sum + p.amount, 0);

  const [year, monthNumber] = month.split('-').map(Number);
  const months = Array.from({ length: 6 }, (_, i) => {
    const date = new Date(year, monthNumber - 1 - i, 1);
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
  });

  return (
    <>
      <PageHeader
        title="Mensalidades"
        description="Controle por competência. Nenhum pagamento entra como recebido sem confirmação real."
      />

      <nav className="no-scrollbar mb-6 flex gap-2 overflow-x-auto">
        {months.map((item) => (
          <Link
            key={item}
            href={{ pathname: '/admin/mensalidades', query: { mes: item } }}
            className={cn(
              'whitespace-nowrap rounded-xl border px-3.5 py-2 text-sm font-medium transition-colors',
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

      <section className="mb-6 grid gap-4 sm:grid-cols-3">
        <StatCard label="Total lançado" value={formatCurrency(total)} />
        <StatCard label="Recebido" value={formatCurrency(received)} tone="success" />
        <StatCard
          label="Em aberto"
          value={formatCurrency(open)}
          tone={open > 0 ? 'orange' : 'default'}
        />
      </section>

      <PaymentsClient
        payments={payments}
        students={studentsResult.data ?? []}
        month={month}
        initialStudentId={searchParams.aluno}
      />
    </>
  );
}
