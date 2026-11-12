'use client';

import { useState, useTransition } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Check, Plus, Receipt, RefreshCw, Trash2, X } from 'lucide-react';
import { Badge } from '@/components/ui/Badge';
import { Modal } from '@/components/ui/Modal';
import { Field } from '@/components/ui/Field';
import { EmptyState } from '@/components/ui/EmptyState';
import { useToast } from '@/components/ui/Toast';
import {
  createPayment,
  deletePayment,
  generateMonthlyPayments,
  setPaymentStatus,
} from '../financeiro/actions';
import type { PaymentStatus } from '@/lib/supabase/database.types';
import { PAYMENT_STATUS } from '@/lib/labels';
import { formatCurrency, formatDate, todayISO } from '@/lib/utils';

export interface PaymentRow {
  id: string;
  student_id: string;
  student_name: string;
  reference_month: string;
  amount: number;
  due_date: string;
  status: PaymentStatus;
  paid_at: string | null;
  method: string | null;
  notes: string | null;
}

export function PaymentsClient({
  payments,
  students,
  month,
  initialStudentId,
}: {
  payments: PaymentRow[];
  students: { id: string; full_name: string; monthly_fee: number | null; due_day: number | null }[];
  month: string;
  initialStudentId?: string;
}) {
  const router = useRouter();
  const toast = useToast();
  const [isPending, startTransition] = useTransition();
  const [newOpen, setNewOpen] = useState(false);
  const [payModal, setPayModal] = useState<PaymentRow | null>(null);

  function run(fn: () => Promise<{ ok: boolean; message?: string }>, success: string) {
    startTransition(async () => {
      const result = await fn();
      if (result.ok) {
        toast.success(result.message ?? success);
        router.refresh();
      } else {
        toast.error(result.message ?? 'Não foi possível concluir a ação.');
      }
    });
  }

  return (
    <>
      <div className="mb-6 flex flex-wrap gap-2.5">
        <button
          type="button"
          onClick={() => setNewOpen(true)}
          className="hpe-btn-primary hpe-btn-sm"
        >
          <Plus className="h-4 w-4" />
          Lançar mensalidade
        </button>
        <button
          type="button"
          disabled={isPending}
          onClick={() =>
            run(() => generateMonthlyPayments(month), 'Mensalidades geradas.')
          }
          className="hpe-btn-ghost hpe-btn-sm"
        >
          <RefreshCw className="h-4 w-4" />
          Gerar mensalidades do mês
        </button>
      </div>

      {payments.length === 0 ? (
        <EmptyState
          icon={Receipt}
          title="Nenhuma mensalidade nesta competência"
          description="Use “Gerar mensalidades do mês” para lançar de uma vez todos os alunos ativos que têm valor e vencimento cadastrados."
        />
      ) : (
        <div className="hpe-card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="hpe-table">
              <thead>
                <tr>
                  <th>Aluno</th>
                  <th>Competência</th>
                  <th>Vencimento</th>
                  <th>Valor</th>
                  <th>Status</th>
                  <th>Pago em</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {payments.map((payment) => {
                  const meta = PAYMENT_STATUS[payment.status];
                  return (
                    <tr key={payment.id}>
                      <td>
                        <Link
                          href={`/admin/alunos/${payment.student_id}?aba=financeiro`}
                          className="font-medium hover:text-hpe-orange"
                        >
                          {payment.student_name}
                        </Link>
                      </td>
                      <td className="tabular-nums">
                        {formatDate(payment.reference_month, {
                          month: '2-digit',
                          year: 'numeric',
                        })}
                      </td>
                      <td className="tabular-nums">{formatDate(payment.due_date)}</td>
                      <td className="font-medium tabular-nums">
                        {formatCurrency(payment.amount)}
                      </td>
                      <td>
                        <Badge tone={meta.tone} dot>
                          {meta.label}
                        </Badge>
                      </td>
                      <td className="tabular-nums text-hpe-muted">
                        {payment.paid_at ? formatDate(payment.paid_at) : '—'}
                        {payment.method ? (
                          <span className="block text-xs">{payment.method}</span>
                        ) : null}
                      </td>
                      <td>
                        <div className="flex justify-end gap-1.5">
                          {payment.status !== 'paid' ? (
                            <button
                              type="button"
                              onClick={() => setPayModal(payment)}
                              title="Registrar pagamento"
                              className="rounded-lg border border-emerald-500/30 p-2 text-emerald-300 transition-colors hover:bg-emerald-500/10"
                            >
                              <Check className="h-4 w-4" />
                            </button>
                          ) : (
                            <button
                              type="button"
                              disabled={isPending}
                              onClick={() =>
                                run(
                                  () => setPaymentStatus(payment.id, 'pending'),
                                  'Pagamento estornado para pendente.',
                                )
                              }
                              title="Desfazer baixa"
                              className="rounded-lg border border-white/10 p-2 text-hpe-muted transition-colors hover:text-hpe-white"
                            >
                              <X className="h-4 w-4" />
                            </button>
                          )}
                          <button
                            type="button"
                            disabled={isPending}
                            onClick={() => {
                              if (!confirm('Excluir este lançamento?')) return;
                              run(() => deletePayment(payment.id), 'Lançamento excluído.');
                            }}
                            title="Excluir"
                            className="rounded-lg border border-white/10 p-2 text-hpe-muted transition-colors hover:text-red-300"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <NewPaymentModal
        open={newOpen}
        onClose={() => setNewOpen(false)}
        students={students}
        month={month}
        initialStudentId={initialStudentId}
        onSaved={() => {
          setNewOpen(false);
          router.refresh();
        }}
      />

      <ConfirmPaymentModal
        payment={payModal}
        onClose={() => setPayModal(null)}
        onSaved={() => {
          setPayModal(null);
          router.refresh();
        }}
      />
    </>
  );
}

function NewPaymentModal({
  open,
  onClose,
  students,
  month,
  initialStudentId,
  onSaved,
}: {
  open: boolean;
  onClose: () => void;
  students: { id: string; full_name: string; monthly_fee: number | null; due_day: number | null }[];
  month: string;
  initialStudentId?: string;
  onSaved: () => void;
}) {
  const toast = useToast();
  const [isPending, startTransition] = useTransition();
  const [studentId, setStudentId] = useState(initialStudentId ?? '');
  const [referenceMonth, setReferenceMonth] = useState(month);
  const [amount, setAmount] = useState('');
  const [dueDate, setDueDate] = useState(`${month}-10`);
  const [notes, setNotes] = useState('');

  function pickStudent(id: string) {
    setStudentId(id);
    const student = students.find((s) => s.id === id);
    if (student?.monthly_fee) setAmount(String(student.monthly_fee));
    if (student?.due_day) {
      setDueDate(`${referenceMonth}-${String(student.due_day).padStart(2, '0')}`);
    }
  }

  function save() {
    startTransition(async () => {
      const result = await createPayment({
        studentId,
        referenceMonth,
        amount,
        dueDate,
        notes: notes.trim() || null,
      });
      if (result.ok) {
        toast.success('Mensalidade lançada.');
        setAmount('');
        setNotes('');
        onSaved();
      } else {
        toast.error(result.message ?? 'Não foi possível lançar.');
      }
    });
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Lançar mensalidade"
      description="O lançamento nasce como pendente. A baixa é feita só com a confirmação do recebimento."
      size="sm"
      footer={
        <>
          <button type="button" onClick={onClose} className="hpe-btn-subtle">
            Cancelar
          </button>
          <button
            type="button"
            onClick={save}
            disabled={isPending || !studentId || amount === ''}
            className="hpe-btn-primary"
          >
            {isPending ? 'Salvando…' : 'Lançar'}
          </button>
        </>
      }
    >
      <div className="space-y-5">
        <Field label="Aluno" htmlFor="pay-student" required>
          <select
            id="pay-student"
            value={studentId}
            onChange={(e) => pickStudent(e.target.value)}
            className="hpe-select"
          >
            <option value="">Selecione…</option>
            {students.map((student) => (
              <option key={student.id} value={student.id}>
                {student.full_name}
              </option>
            ))}
          </select>
        </Field>

        <Field label="Competência" htmlFor="pay-month" required>
          <input
            id="pay-month"
            type="month"
            value={referenceMonth}
            onChange={(e) => setReferenceMonth(e.target.value)}
            className="hpe-input"
          />
        </Field>

        <Field label="Valor (R$)" htmlFor="pay-amount" required>
          <input
            id="pay-amount"
            inputMode="decimal"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            placeholder="0,00"
            className="hpe-input"
          />
        </Field>

        <Field label="Vencimento" htmlFor="pay-due" required>
          <input
            id="pay-due"
            type="date"
            value={dueDate}
            onChange={(e) => setDueDate(e.target.value)}
            className="hpe-input"
          />
        </Field>

        <Field label="Observações" htmlFor="pay-notes">
          <input
            id="pay-notes"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            className="hpe-input"
          />
        </Field>
      </div>
    </Modal>
  );
}

function ConfirmPaymentModal({
  payment,
  onClose,
  onSaved,
}: {
  payment: PaymentRow | null;
  onClose: () => void;
  onSaved: () => void;
}) {
  const toast = useToast();
  const [isPending, startTransition] = useTransition();
  const [method, setMethod] = useState('Pix');

  function confirm(status: PaymentStatus) {
    if (!payment) return;
    startTransition(async () => {
      const result = await setPaymentStatus(payment.id, status, method);
      if (result.ok) {
        toast.success(
          status === 'paid' ? 'Pagamento registrado.' : 'Status atualizado.',
        );
        onSaved();
      } else {
        toast.error(result.message ?? 'Não foi possível atualizar.');
      }
    });
  }

  return (
    <Modal
      open={Boolean(payment)}
      onClose={onClose}
      title="Registrar pagamento"
      description={
        payment
          ? `${payment.student_name} · ${formatCurrency(payment.amount)} · vencimento ${formatDate(payment.due_date)}`
          : undefined
      }
      size="sm"
      footer={
        <>
          <button type="button" onClick={onClose} className="hpe-btn-subtle">
            Cancelar
          </button>
          <button
            type="button"
            onClick={() => confirm('paid')}
            disabled={isPending}
            className="hpe-btn-primary"
          >
            {isPending ? 'Registrando…' : 'Confirmar recebimento'}
          </button>
        </>
      }
    >
      <div className="space-y-5">
        <p className="rounded-xl border border-hpe-orange/25 bg-hpe-orange/[0.05] px-4 py-3 text-sm leading-relaxed text-hpe-muted">
          Confirme apenas se o valor foi efetivamente recebido. A data de hoje (
          {formatDate(todayISO())}) será gravada como data de pagamento.
        </p>

        <Field label="Forma de pagamento" htmlFor="pay-method">
          <select
            id="pay-method"
            value={method}
            onChange={(e) => setMethod(e.target.value)}
            className="hpe-select"
          >
            {['Pix', 'Dinheiro', 'Cartão', 'Transferência', 'Outro'].map((item) => (
              <option key={item} value={item}>
                {item}
              </option>
            ))}
          </select>
        </Field>

        <div className="flex flex-wrap gap-2 border-t border-white/[0.07] pt-5">
          <button
            type="button"
            onClick={() => confirm('exempt')}
            disabled={isPending}
            className="hpe-btn-subtle hpe-btn-sm"
          >
            Marcar como isento
          </button>
          <button
            type="button"
            onClick={() => confirm('cancelled')}
            disabled={isPending}
            className="hpe-btn-subtle hpe-btn-sm"
          >
            Cancelar cobrança
          </button>
        </div>
      </div>
    </Modal>
  );
}
