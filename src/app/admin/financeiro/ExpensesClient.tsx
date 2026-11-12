'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { Plus, Receipt, Trash2 } from 'lucide-react';
import { Modal } from '@/components/ui/Modal';
import { Field } from '@/components/ui/Field';
import { EmptyState } from '@/components/ui/EmptyState';
import { useToast } from '@/components/ui/Toast';
import { createExpense, deleteExpense } from './actions';
import type { Expense } from '@/lib/supabase/database.types';
import { formatCurrency, formatDate, todayISO } from '@/lib/utils';

const CATEGORIES = [
  'operacional',
  'taxas',
  'materiais',
  'equipamentos',
  'marketing',
  'outras',
];

export function ExpensesClient({ expenses }: { expenses: Expense[] }) {
  const router = useRouter();
  const toast = useToast();
  const [isPending, startTransition] = useTransition();
  const [open, setOpen] = useState(false);

  const [description, setDescription] = useState('');
  const [category, setCategory] = useState(CATEGORIES[0]);
  const [value, setValue] = useState('');
  const [spentOn, setSpentOn] = useState(todayISO());
  const [notes, setNotes] = useState('');

  function save() {
    startTransition(async () => {
      const result = await createExpense({
        description,
        category,
        amount: value,
        spentOn,
        notes: notes.trim() || null,
      });
      if (result.ok) {
        toast.success('Despesa lançada.');
        setDescription('');
        setValue('');
        setNotes('');
        setOpen(false);
        router.refresh();
      } else {
        toast.error(result.message ?? 'Não foi possível lançar.');
      }
    });
  }

  return (
    <>
      <div className="mb-4 flex items-center justify-between gap-3">
        <h2 className="font-display text-base font-bold uppercase tracking-wide">
          Despesas
        </h2>
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="hpe-btn-subtle hpe-btn-sm"
        >
          <Plus className="h-4 w-4" />
          Nova despesa
        </button>
      </div>

      {expenses.length === 0 ? (
        <EmptyState
          icon={Receipt}
          title="Nenhuma despesa lançada"
          description="Lance custos operacionais, taxas e materiais para acompanhar o resultado líquido."
          className="py-10"
        />
      ) : (
        <div className="hpe-card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="hpe-table">
              <thead>
                <tr>
                  <th>Data</th>
                  <th>Descrição</th>
                  <th>Categoria</th>
                  <th>Valor</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {expenses.map((expense) => (
                  <tr key={expense.id}>
                    <td className="whitespace-nowrap tabular-nums">
                      {formatDate(expense.spent_on)}
                    </td>
                    <td>
                      <p className="font-medium">{expense.description}</p>
                      {expense.notes ? (
                        <p className="text-xs text-hpe-muted">{expense.notes}</p>
                      ) : null}
                    </td>
                    <td className="text-sm capitalize text-hpe-muted">
                      {expense.category}
                    </td>
                    <td className="font-medium tabular-nums text-red-300">
                      −{formatCurrency(Number(expense.amount))}
                    </td>
                    <td className="w-10">
                      <button
                        type="button"
                        disabled={isPending}
                        onClick={() => {
                          if (!confirm('Excluir esta despesa?')) return;
                          startTransition(async () => {
                            const result = await deleteExpense(expense.id);
                            if (result.ok) {
                              toast.success('Despesa excluída.');
                              router.refresh();
                            } else {
                              toast.error(result.message ?? 'Não foi possível excluir.');
                            }
                          });
                        }}
                        title="Excluir"
                        className="rounded-lg p-1.5 text-hpe-muted transition-colors hover:text-red-300"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title="Nova despesa"
        size="sm"
        footer={
          <>
            <button type="button" onClick={() => setOpen(false)} className="hpe-btn-subtle">
              Cancelar
            </button>
            <button
              type="button"
              onClick={save}
              disabled={isPending || description.trim().length < 2 || value === ''}
              className="hpe-btn-primary"
            >
              {isPending ? 'Salvando…' : 'Lançar'}
            </button>
          </>
        }
      >
        <div className="space-y-5">
          <Field label="Descrição" htmlFor="exp-desc" required>
            <input
              id="exp-desc"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="hpe-input"
            />
          </Field>
          <Field label="Categoria" htmlFor="exp-cat" required>
            <select
              id="exp-cat"
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="hpe-select capitalize"
            >
              {CATEGORIES.map((item) => (
                <option key={item} value={item} className="capitalize">
                  {item}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Valor (R$)" htmlFor="exp-value" required>
            <input
              id="exp-value"
              inputMode="decimal"
              value={value}
              onChange={(e) => setValue(e.target.value)}
              placeholder="0,00"
              className="hpe-input"
            />
          </Field>
          <Field label="Data" htmlFor="exp-date" required>
            <input
              id="exp-date"
              type="date"
              value={spentOn}
              onChange={(e) => setSpentOn(e.target.value)}
              className="hpe-input"
            />
          </Field>
          <Field label="Observações" htmlFor="exp-notes">
            <textarea
              id="exp-notes"
              rows={2}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="hpe-textarea"
            />
          </Field>
        </div>
      </Modal>
    </>
  );
}
