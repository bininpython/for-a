'use server';

import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { createClient } from '@/lib/supabase/server';

export interface ActionResult {
  ok: boolean;
  message?: string;
}

const logSchema = z.object({
  exerciseId: z.string().uuid(),
  dayId: z.string().uuid().nullable(),
  setNumber: z.coerce.number().int().min(1).max(20),
  repsDone: z
    .union([z.string(), z.number()])
    .nullable()
    .optional()
    .transform((value) => {
      if (value === null || value === undefined || value === '') return null;
      const parsed = Number(value);
      return Number.isInteger(parsed) && parsed >= 0 ? parsed : null;
    }),
  loadKg: z
    .union([z.string(), z.number()])
    .nullable()
    .optional()
    .transform((value) => {
      if (value === null || value === undefined || value === '') return null;
      const parsed = Number(String(value).replace(',', '.'));
      return Number.isFinite(parsed) && parsed >= 0 ? parsed : null;
    }),
});

/**
 * Registra uma série concluída.
 *
 * O `student_id` vem de `current_student_id()` no servidor — o cliente não
 * escolhe de quem é o registro, e a política RLS recusa qualquer outro aluno.
 */
export async function logSet(input: {
  exerciseId: string;
  dayId: string | null;
  setNumber: number;
  repsDone?: string | number | null;
  loadKg?: string | number | null;
}): Promise<ActionResult> {
  try {
    const parsed = logSchema.safeParse(input);
    if (!parsed.success) {
      return { ok: false, message: 'Dados do registro inválidos.' };
    }

    const supabase = createClient();
    const { data: studentId } = await supabase.rpc('current_student_id');
    if (!studentId) {
      return { ok: false, message: 'Sua conta não está vinculada a um cadastro.' };
    }

    const { error } = await supabase.from('exercise_logs').insert({
      student_id: studentId,
      exercise_id: parsed.data.exerciseId,
      day_id: parsed.data.dayId,
      set_number: parsed.data.setNumber,
      reps_done: parsed.data.repsDone,
      load_kg: parsed.data.loadKg,
    });

    if (error) return { ok: false, message: 'Não foi possível registrar a série.' };

    revalidatePath('/aluno/treino');
    revalidatePath('/aluno/evolucao');
    return { ok: true };
  } catch (err) {
    return { ok: false, message: err instanceof Error ? err.message : 'Erro inesperado.' };
  }
}

/** Desfaz o registro de uma série (apenas do próprio aluno, via RLS). */
export async function undoSet(logId: string): Promise<ActionResult> {
  try {
    const supabase = createClient();
    const { error } = await supabase.from('exercise_logs').delete().eq('id', logId);
    if (error) return { ok: false, message: 'Não foi possível desfazer o registro.' };
    revalidatePath('/aluno/treino');
    return { ok: true };
  } catch (err) {
    return { ok: false, message: err instanceof Error ? err.message : 'Erro inesperado.' };
  }
}
