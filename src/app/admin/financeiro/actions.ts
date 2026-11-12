'use server';

import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { createClient } from '@/lib/supabase/server';
import type { PaymentStatus } from '@/lib/supabase/database.types';

export interface ActionResult<T = undefined> {
  ok: boolean;
  message?: string;
  data?: T;
}

async function assertAdmin() {
  const supabase = createClient();
  const { data, error } = await supabase.rpc('is_admin');
  if (error || !data) throw new Error('Acesso negado.');
  return supabase;
}

function refresh() {
  revalidatePath('/admin/financeiro');
  revalidatePath('/admin/mensalidades');
  revalidatePath('/admin');
  revalidatePath('/aluno/financeiro');
}

const amount = z
  .union([z.string(), z.number()])
  .transform((value) => Number(String(value).replace(',', '.')))
  .refine((value) => Number.isFinite(value) && value >= 0, {
    message: 'Informe um valor válido.',
  });

// ─── Mensalidades ───────────────────────────────────────────────────────────

const paymentSchema = z.object({
  studentId: z.string().uuid('Selecione o aluno.'),
  referenceMonth: z.string().regex(/^\d{4}-\d{2}$/, 'Informe a competência.'),
  amount,
  dueDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Informe o vencimento.'),
  notes: z.string().trim().max(500).nullable().optional(),
});

export async function createPayment(input: {
  studentId: string;
  referenceMonth: string;
  amount: string | number;
  dueDate: string;
  notes?: string | null;
}): Promise<ActionResult> {
  try {
    const supabase = await assertAdmin();
    const parsed = paymentSchema.safeParse(input);
    if (!parsed.success) {
      return { ok: false, message: parsed.error.issues[0]?.message ?? 'Dados inválidos.' };
    }

    const { error } = await supabase.from('payments').insert({
      student_id: parsed.data.studentId,
      reference_month: `${parsed.data.referenceMonth}-01`,
      amount: parsed.data.amount,
      due_date: parsed.data.dueDate,
      status: 'pending',
      notes: parsed.data.notes || null,
    });

    if (error) {
      return {
        ok: false,
        message:
          error.code === '23505'
            ? 'Já existe uma mensalidade desse aluno nesta competência.'
            : 'Não foi possível lançar a mensalidade.',
      };
    }

    refresh();
    return { ok: true };
  } catch (err) {
    return { ok: false, message: err instanceof Error ? err.message : 'Erro inesperado.' };
  }
}

/**
 * Marca o pagamento. 'paid' exige data de confirmação real — a própria
 * constraint do banco recusa um pagamento marcado como pago sem ela.
 */
export async function setPaymentStatus(
  paymentId: string,
  status: PaymentStatus,
  method?: string | null,
): Promise<ActionResult> {
  try {
    const supabase = await assertAdmin();

    const { error } = await supabase
      .from('payments')
      .update({
        status,
        paid_at: status === 'paid' ? new Date().toISOString() : null,
        method: status === 'paid' ? (method || null) : null,
      })
      .eq('id', paymentId);

    if (error) return { ok: false, message: 'Não foi possível atualizar o pagamento.' };

    refresh();
    return { ok: true };
  } catch (err) {
    return { ok: false, message: err instanceof Error ? err.message : 'Erro inesperado.' };
  }
}

export async function deletePayment(paymentId: string): Promise<ActionResult> {
  try {
    const supabase = await assertAdmin();
    const { error } = await supabase.from('payments').delete().eq('id', paymentId);
    if (error) return { ok: false, message: 'Não foi possível excluir o lançamento.' };
    refresh();
    return { ok: true };
  } catch (err) {
    return { ok: false, message: err instanceof Error ? err.message : 'Erro inesperado.' };
  }
}

/**
 * Gera as mensalidades do mês para todos os alunos ativos que tenham valor e
 * dia de vencimento cadastrados. Alunos já lançados no mês são ignorados.
 */
export async function generateMonthlyPayments(
  referenceMonth: string,
): Promise<ActionResult<{ created: number; skipped: number }>> {
  try {
    const supabase = await assertAdmin();

    if (!/^\d{4}-\d{2}$/.test(referenceMonth)) {
      return { ok: false, message: 'Competência inválida.' };
    }

    const [{ data: students }, { data: existing }] = await Promise.all([
      supabase
        .from('students')
        .select('id, monthly_fee, due_day')
        .eq('contract_status', 'active'),
      supabase
        .from('payments')
        .select('student_id')
        .eq('reference_month', `${referenceMonth}-01`),
    ]);

    const alreadyCharged = new Set((existing ?? []).map((p) => p.student_id));
    const eligible = (students ?? []).filter(
      (student) =>
        student.monthly_fee !== null &&
        Number(student.monthly_fee) > 0 &&
        student.due_day !== null &&
        !alreadyCharged.has(student.id),
    );

    if (eligible.length === 0) {
      return {
        ok: true,
        message: 'Nenhuma mensalidade nova a gerar.',
        data: { created: 0, skipped: alreadyCharged.size },
      };
    }

    const [year, month] = referenceMonth.split('-').map(Number);
    const lastDay = new Date(year, month, 0).getDate();

    const rows = eligible.map((student) => {
      const day = Math.min(student.due_day as number, lastDay);
      return {
        student_id: student.id,
        reference_month: `${referenceMonth}-01`,
        amount: Number(student.monthly_fee),
        due_date: `${referenceMonth}-${String(day).padStart(2, '0')}`,
        status: 'pending' as const,
      };
    });

    const { error } = await supabase.from('payments').insert(rows);
    if (error) return { ok: false, message: 'Não foi possível gerar as mensalidades.' };

    refresh();
    return {
      ok: true,
      message: `${rows.length} mensalidade(s) gerada(s).`,
      data: { created: rows.length, skipped: alreadyCharged.size },
    };
  } catch (err) {
    return { ok: false, message: err instanceof Error ? err.message : 'Erro inesperado.' };
  }
}

// ─── Despesas ───────────────────────────────────────────────────────────────

const expenseSchema = z.object({
  description: z.string().trim().min(2, 'Descreva a despesa.').max(200),
  category: z.string().trim().min(1).max(60),
  amount,
  spentOn: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Informe a data.'),
  notes: z.string().trim().max(500).nullable().optional(),
});

export async function createExpense(input: {
  description: string;
  category: string;
  amount: string | number;
  spentOn: string;
  notes?: string | null;
}): Promise<ActionResult> {
  try {
    const supabase = await assertAdmin();
    const parsed = expenseSchema.safeParse(input);
    if (!parsed.success) {
      return { ok: false, message: parsed.error.issues[0]?.message ?? 'Dados inválidos.' };
    }

    const { error } = await supabase.from('expenses').insert({
      description: parsed.data.description,
      category: parsed.data.category,
      amount: parsed.data.amount,
      spent_on: parsed.data.spentOn,
      notes: parsed.data.notes || null,
    });

    if (error) return { ok: false, message: 'Não foi possível lançar a despesa.' };

    refresh();
    return { ok: true };
  } catch (err) {
    return { ok: false, message: err instanceof Error ? err.message : 'Erro inesperado.' };
  }
}

export async function deleteExpense(expenseId: string): Promise<ActionResult> {
  try {
    const supabase = await assertAdmin();
    const { error } = await supabase.from('expenses').delete().eq('id', expenseId);
    if (error) return { ok: false, message: 'Não foi possível excluir a despesa.' };
    refresh();
    return { ok: true };
  } catch (err) {
    return { ok: false, message: err instanceof Error ? err.message : 'Erro inesperado.' };
  }
}
