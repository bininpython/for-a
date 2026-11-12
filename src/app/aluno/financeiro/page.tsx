import { CreditCard, MessageCircle } from 'lucide-react';
import { PageHeader } from '@/components/dashboard/PageHeader';
import { Badge } from '@/components/ui/Badge';
import { StatCard } from '@/components/ui/StatCard';
import { EmptyState } from '@/components/ui/EmptyState';
import { requireStudent } from '@/lib/auth';
import { createClient } from '@/lib/supabase/server';
import { PAYMENT_STATUS } from '@/lib/labels';
import { formatCurrency, formatDate, whatsappLink } from '@/lib/utils';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Meu financeiro' };

export default async function StudentFinancePage() {
  const { student } = await requireStudent();
  const supabase = createClient();

  await supabase.rpc('refresh_overdue_payments');

  const [paymentsResult, settingsResult] = await Promise.all([
    supabase
      .from('payments')
      .select('*')
      .eq('student_id', student.id)
      .order('reference_month', { ascending: false }),
    supabase
      .from('personal_settings')
      .select('whatsapp')
      .limit(1)
      .maybeSingle(),
  ]);

  const payments = paymentsResult.data ?? [];
  const open = payments
    .filter((p) => p.status === 'pending' || p.status === 'overdue')
    .reduce((sum, p) => sum + Number(p.amount), 0);
  const paidThisYear = payments
    .filter(
      (p) =>
        p.status === 'paid' &&
        p.reference_month.startsWith(String(new Date().getFullYear())),
    )
    .reduce((sum, p) => sum + Number(p.amount), 0);

  const wa = whatsappLink(
    settingsResult.data?.whatsapp,
    'Olá, Patrick! Queria falar sobre a minha mensalidade.',
  );

  return (
    <>
      <PageHeader
        title="Meu financeiro"
        description="Plano contratado, vencimentos e histórico de pagamentos."
      />

      <section className="mb-6 grid gap-4 sm:grid-cols-3">
        <StatCard
          label="Plano"
          value={student.plan_name ?? '—'}
          hint={formatCurrency(student.monthly_fee)}
          icon={CreditCard}
        />
        <StatCard
          label="Vencimento"
          value={student.due_day ? `Dia ${student.due_day}` : '—'}
        />
        <StatCard
          label="Em aberto"
          value={formatCurrency(open)}
          tone={open > 0 ? 'danger' : 'success'}
          hint={open > 0 ? 'Regularize com o Patrick' : 'Tudo em dia'}
        />
      </section>

      {payments.length === 0 ? (
        <EmptyState
          icon={CreditCard}
          title="Nenhuma mensalidade lançada"
          description="Assim que o Patrick lançar suas mensalidades, elas aparecem aqui."
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
                {payments.map((payment) => {
                  const meta = PAYMENT_STATUS[payment.status];
                  return (
                    <tr key={payment.id}>
                      <td className="tabular-nums">
                        {formatDate(payment.reference_month, {
                          month: 'long',
                          year: 'numeric',
                        })}
                      </td>
                      <td className="tabular-nums">{formatDate(payment.due_date)}</td>
                      <td className="font-medium tabular-nums">
                        {formatCurrency(Number(payment.amount))}
                      </td>
                      <td>
                        <Badge tone={meta.tone} dot>
                          {meta.label}
                        </Badge>
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

      {paidThisYear > 0 ? (
        <p className="mt-5 text-sm text-hpe-muted">
          Total pago em {new Date().getFullYear()}:{' '}
          <strong className="text-hpe-white">{formatCurrency(paidThisYear)}</strong>
        </p>
      ) : null}

      {wa ? (
        <a
          href={wa}
          target="_blank"
          rel="noopener noreferrer"
          className="hpe-btn-ghost mt-6"
        >
          <MessageCircle className="h-4 w-4" />
          Falar sobre pagamento
        </a>
      ) : null}

      <p className="mt-8 rounded-xl border border-white/10 bg-white/[0.02] px-4 py-3 text-xs leading-relaxed text-hpe-muted">
        A plataforma não processa pagamentos. Os valores acima refletem os
        lançamentos feitos pelo Patrick, e uma mensalidade só aparece como paga
        depois que ele confirma o recebimento.
      </p>
    </>
  );
}
