'use server';

import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { createClient } from '@/lib/supabase/server';

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

const optionalNumber = (min: number, max: number) =>
  z
    .union([z.string(), z.number()])
    .nullable()
    .optional()
    .transform((value) => {
      if (value === null || value === undefined || value === '') return null;
      const parsed = Number(String(value).replace(',', '.'));
      return Number.isFinite(parsed) && parsed >= min && parsed <= max ? parsed : null;
    });

const assessmentSchema = z.object({
  studentId: z.string().uuid('Selecione o aluno.'),
  assessedOn: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Data inválida.'),
  weightKg: optionalNumber(20, 400),
  heightCm: optionalNumber(80, 260),
  bodyFatPct: optionalNumber(0, 70),
  leanMassKg: optionalNumber(0, 300),
  restingHr: optionalNumber(20, 240),
  notes: z.string().trim().max(2000).nullable().optional(),
  measurements: z
    .array(
      z.object({
        site: z.string().trim().min(1).max(60),
        valueCm: z.union([z.string(), z.number()]),
      }),
    )
    .max(30)
    .optional(),
});

export interface AssessmentInput {
  studentId: string;
  assessedOn: string;
  weightKg?: string | number | null;
  heightCm?: string | number | null;
  bodyFatPct?: string | number | null;
  leanMassKg?: string | number | null;
  restingHr?: string | number | null;
  notes?: string | null;
  measurements?: { site: string; valueCm: string | number }[];
}

export async function createAssessment(
  input: AssessmentInput,
): Promise<ActionResult<{ id: string }>> {
  try {
    const supabase = await assertAdmin();
    const parsed = assessmentSchema.safeParse(input);
    if (!parsed.success) {
      return { ok: false, message: parsed.error.issues[0]?.message ?? 'Dados inválidos.' };
    }

    const { data: assessment, error } = await supabase
      .from('physical_assessments')
      .insert({
        student_id: parsed.data.studentId,
        assessed_on: parsed.data.assessedOn,
        weight_kg: parsed.data.weightKg,
        height_cm: parsed.data.heightCm,
        body_fat_pct: parsed.data.bodyFatPct,
        lean_mass_kg: parsed.data.leanMassKg,
        resting_hr: parsed.data.restingHr,
        notes: parsed.data.notes || null,
      })
      .select('id')
      .single();

    if (error || !assessment) {
      return { ok: false, message: 'Não foi possível salvar a avaliação.' };
    }

    // Só grava medidas efetivamente preenchidas.
    const measurements = (parsed.data.measurements ?? [])
      .map((item) => ({
        assessment_id: assessment.id,
        site: item.site,
        value_cm: Number(String(item.valueCm).replace(',', '.')),
      }))
      .filter((item) => Number.isFinite(item.value_cm) && item.value_cm > 0);

    if (measurements.length) {
      await supabase.from('body_measurements').insert(measurements);
    }

    revalidatePath('/admin/avaliacoes');
    revalidatePath('/admin/evolucao');
    revalidatePath(`/admin/alunos/${parsed.data.studentId}`);
    revalidatePath('/aluno/avaliacoes');
    revalidatePath('/aluno/evolucao');
    return { ok: true, data: { id: assessment.id } };
  } catch (err) {
    return { ok: false, message: err instanceof Error ? err.message : 'Erro inesperado.' };
  }
}

export async function deleteAssessment(assessmentId: string): Promise<ActionResult> {
  try {
    const supabase = await assertAdmin();
    const { error } = await supabase
      .from('physical_assessments')
      .delete()
      .eq('id', assessmentId);

    if (error) return { ok: false, message: 'Não foi possível excluir a avaliação.' };

    revalidatePath('/admin/avaliacoes');
    revalidatePath('/admin/evolucao');
    return { ok: true };
  } catch (err) {
    return { ok: false, message: err instanceof Error ? err.message : 'Erro inesperado.' };
  }
}
