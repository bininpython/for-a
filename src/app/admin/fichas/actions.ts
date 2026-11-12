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

function fail(err: unknown): ActionResult<never> {
  return { ok: false, message: err instanceof Error ? err.message : 'Erro inesperado.' };
}

// ─── Fichas ─────────────────────────────────────────────────────────────────

const planSchema = z.object({
  studentId: z.string().uuid().nullable(),
  name: z.string().trim().min(2, 'Dê um nome à ficha.').max(120),
  goal: z.string().trim().max(200).optional().nullable(),
  split: z.string().trim().max(40).optional().nullable(),
  notes: z.string().trim().max(2000).optional().nullable(),
  isTemplate: z.boolean(),
  days: z.array(z.string().trim().min(1).max(4)).max(7),
});

export async function createPlan(input: {
  studentId: string | null;
  name: string;
  goal?: string | null;
  split?: string | null;
  notes?: string | null;
  isTemplate: boolean;
  days: string[];
}): Promise<ActionResult<{ id: string }>> {
  try {
    const supabase = await assertAdmin();
    const parsed = planSchema.safeParse(input);
    if (!parsed.success) {
      return { ok: false, message: parsed.error.issues[0]?.message ?? 'Dados inválidos.' };
    }
    if (!parsed.data.isTemplate && !parsed.data.studentId) {
      return { ok: false, message: 'Escolha o aluno ou marque como modelo reutilizável.' };
    }

    const { data: plan, error } = await supabase
      .from('training_plans')
      .insert({
        student_id: parsed.data.isTemplate ? null : parsed.data.studentId,
        name: parsed.data.name,
        goal: parsed.data.goal ?? null,
        split: parsed.data.split ?? null,
        notes: parsed.data.notes ?? null,
        is_template: parsed.data.isTemplate,
        published: false,
      })
      .select('id')
      .single();

    if (error || !plan) return { ok: false, message: 'Não foi possível criar a ficha.' };

    if (parsed.data.days.length) {
      await supabase.from('training_days').insert(
        parsed.data.days.map((label, index) => ({
          plan_id: plan.id,
          label,
          title: 'A definir',
          sort_order: index,
        })),
      );
    }

    revalidatePath('/admin/fichas');
    return { ok: true, data: { id: plan.id } };
  } catch (err) {
    return fail(err);
  }
}

export async function updatePlan(
  planId: string,
  values: { name?: string; goal?: string | null; split?: string | null; notes?: string | null },
): Promise<ActionResult> {
  try {
    const supabase = await assertAdmin();
    const { error } = await supabase.from('training_plans').update(values).eq('id', planId);
    if (error) return { ok: false, message: 'Não foi possível salvar a ficha.' };
    revalidatePath(`/admin/fichas/${planId}`);
    return { ok: true };
  } catch (err) {
    return fail(err);
  }
}

/** Publicar torna a ficha visível para o aluno na área dele. */
export async function setPlanPublished(
  planId: string,
  published: boolean,
): Promise<ActionResult> {
  try {
    const supabase = await assertAdmin();

    const { data: plan } = await supabase
      .from('training_plans')
      .select('student_id, is_template')
      .eq('id', planId)
      .maybeSingle();

    if (!plan) return { ok: false, message: 'Ficha não encontrada.' };
    if (plan.is_template) {
      return { ok: false, message: 'Modelos não são publicados. Copie para um aluno.' };
    }

    const { error } = await supabase
      .from('training_plans')
      .update({ published })
      .eq('id', planId);

    if (error) return { ok: false, message: 'Não foi possível alterar a publicação.' };

    // Avisa o aluno dentro da plataforma, sem simular envio externo.
    if (published && plan.student_id) {
      const { data: student } = await supabase
        .from('students')
        .select('profile_id')
        .eq('id', plan.student_id)
        .maybeSingle();

      if (student?.profile_id) {
        await supabase.from('notifications').insert({
          profile_id: student.profile_id,
          kind: 'announcement',
          title: 'Nova ficha de treino disponível',
          body: 'Seu personal publicou uma ficha atualizada.',
          link: '/aluno/ficha',
        });
      }
    }

    revalidatePath(`/admin/fichas/${planId}`);
    revalidatePath('/admin/fichas');
    revalidatePath('/aluno/ficha');
    return { ok: true };
  } catch (err) {
    return fail(err);
  }
}

/** Copia a ficha inteira (dias + exercícios) para um aluno ou como modelo. */
export async function duplicatePlan(
  planId: string,
  targetStudentId: string | null,
): Promise<ActionResult<{ id: string }>> {
  try {
    const supabase = await assertAdmin();

    const { data: source } = await supabase
      .from('training_plans')
      .select('*, training_days(*, exercises(*))')
      .eq('id', planId)
      .maybeSingle();

    if (!source) return { ok: false, message: 'Ficha de origem não encontrada.' };

    const { data: copy, error } = await supabase
      .from('training_plans')
      .insert({
        student_id: targetStudentId,
        name: targetStudentId ? source.name : `${source.name} (modelo)`,
        goal: source.goal,
        split: source.split,
        notes: source.notes,
        is_template: targetStudentId === null,
        published: false,
      })
      .select('id')
      .single();

    if (error || !copy) return { ok: false, message: 'Não foi possível copiar a ficha.' };

    const days = (source.training_days ?? []) as {
      label: string;
      title: string;
      notes: string | null;
      sort_order: number;
      exercises: {
        name: string;
        muscle_group: string | null;
        media_url: string | null;
        sets: number;
        reps: string;
        load_kg: number | null;
        rest_seconds: number;
        notes: string | null;
        sort_order: number;
      }[];
    }[];

    for (const day of days) {
      const { data: newDay } = await supabase
        .from('training_days')
        .insert({
          plan_id: copy.id,
          label: day.label,
          title: day.title,
          notes: day.notes,
          sort_order: day.sort_order,
        })
        .select('id')
        .single();

      if (newDay && day.exercises?.length) {
        await supabase.from('exercises').insert(
          day.exercises.map((exercise) => ({ ...exercise, day_id: newDay.id })),
        );
      }
    }

    revalidatePath('/admin/fichas');
    return { ok: true, data: { id: copy.id } };
  } catch (err) {
    return fail(err);
  }
}

export async function deletePlan(planId: string): Promise<ActionResult> {
  try {
    const supabase = await assertAdmin();
    const { error } = await supabase.from('training_plans').delete().eq('id', planId);
    if (error) return { ok: false, message: 'Não foi possível excluir a ficha.' };
    revalidatePath('/admin/fichas');
    return { ok: true };
  } catch (err) {
    return fail(err);
  }
}

// ─── Dias de treino ─────────────────────────────────────────────────────────

export async function addDay(
  planId: string,
  label: string,
  title: string,
): Promise<ActionResult> {
  try {
    const supabase = await assertAdmin();

    const { count } = await supabase
      .from('training_days')
      .select('id', { count: 'exact', head: true })
      .eq('plan_id', planId);

    const { error } = await supabase.from('training_days').insert({
      plan_id: planId,
      label: label.trim().toUpperCase().slice(0, 4) || 'A',
      title: title.trim() || 'A definir',
      sort_order: count ?? 0,
    });

    if (error) {
      return {
        ok: false,
        message:
          error.code === '23505'
            ? 'Já existe um dia com essa letra nesta ficha.'
            : 'Não foi possível adicionar o dia.',
      };
    }

    revalidatePath(`/admin/fichas/${planId}`);
    return { ok: true };
  } catch (err) {
    return fail(err);
  }
}

export async function updateDay(
  dayId: string,
  planId: string,
  values: { label?: string; title?: string; notes?: string | null },
): Promise<ActionResult> {
  try {
    const supabase = await assertAdmin();
    const { error } = await supabase.from('training_days').update(values).eq('id', dayId);
    if (error) return { ok: false, message: 'Não foi possível salvar o dia.' };
    revalidatePath(`/admin/fichas/${planId}`);
    return { ok: true };
  } catch (err) {
    return fail(err);
  }
}

export async function deleteDay(dayId: string, planId: string): Promise<ActionResult> {
  try {
    const supabase = await assertAdmin();
    const { error } = await supabase.from('training_days').delete().eq('id', dayId);
    if (error) return { ok: false, message: 'Não foi possível excluir o dia.' };
    revalidatePath(`/admin/fichas/${planId}`);
    return { ok: true };
  } catch (err) {
    return fail(err);
  }
}

// ─── Exercícios ─────────────────────────────────────────────────────────────

/** Os formulários enviam tudo como texto; a validação converte. */
export interface ExerciseInput {
  name: string;
  muscle_group?: string | null;
  media_url?: string | null;
  sets: string | number;
  reps: string;
  load_kg?: string | number | null;
  rest_seconds: string | number;
  notes?: string | null;
}

const numberish = (min: number, max: number, integer = true) =>
  z
    .union([z.string(), z.number()])
    .transform((value) => (value === '' ? null : Number(value)))
    .refine(
      (value) =>
        value !== null &&
        Number.isFinite(value) &&
        (!integer || Number.isInteger(value)) &&
        value >= min &&
        value <= max,
      { message: `Informe um valor entre ${min} e ${max}.` },
    )
    .transform((value) => value as number);

const exerciseSchema = z.object({
  name: z.string().trim().min(2, 'Informe o nome do exercício.').max(120),
  muscle_group: z
    .string()
    .trim()
    .max(60)
    .nullable()
    .optional()
    .transform((value) => value || null),
  media_url: z
    .string()
    .trim()
    .nullable()
    .optional()
    .transform((value) => value || null)
    .refine((value) => value === null || /^https?:\/\/\S+$/.test(value), {
      message: 'URL da imagem inválida.',
    }),
  sets: numberish(1, 20),
  reps: z.string().trim().min(1, 'Informe as repetições.').max(40),
  load_kg: z
    .union([z.string(), z.number()])
    .nullable()
    .optional()
    .transform((value) => {
      if (value === null || value === undefined || value === '') return null;
      const parsed = Number(value);
      return Number.isFinite(parsed) && parsed >= 0 ? parsed : null;
    }),
  rest_seconds: numberish(0, 900),
  notes: z
    .string()
    .trim()
    .max(500)
    .nullable()
    .optional()
    .transform((value) => value || null),
});

export async function addExercise(
  dayId: string,
  planId: string,
  input: ExerciseInput,
): Promise<ActionResult> {
  try {
    const supabase = await assertAdmin();
    const parsed = exerciseSchema.safeParse(input);
    if (!parsed.success) {
      return { ok: false, message: parsed.error.issues[0]?.message ?? 'Dados inválidos.' };
    }

    const { count } = await supabase
      .from('exercises')
      .select('id', { count: 'exact', head: true })
      .eq('day_id', dayId);

    const { error } = await supabase.from('exercises').insert({
      day_id: dayId,
      ...parsed.data,
      media_url: parsed.data.media_url || null,
      sort_order: count ?? 0,
    });

    if (error) return { ok: false, message: 'Não foi possível adicionar o exercício.' };

    revalidatePath(`/admin/fichas/${planId}`);
    return { ok: true };
  } catch (err) {
    return fail(err);
  }
}

export async function updateExercise(
  exerciseId: string,
  planId: string,
  input: ExerciseInput,
): Promise<ActionResult> {
  try {
    const supabase = await assertAdmin();
    const parsed = exerciseSchema.safeParse(input);
    if (!parsed.success) {
      return { ok: false, message: parsed.error.issues[0]?.message ?? 'Dados inválidos.' };
    }

    const { error } = await supabase
      .from('exercises')
      .update({ ...parsed.data, media_url: parsed.data.media_url || null })
      .eq('id', exerciseId);

    if (error) return { ok: false, message: 'Não foi possível salvar o exercício.' };

    revalidatePath(`/admin/fichas/${planId}`);
    return { ok: true };
  } catch (err) {
    return fail(err);
  }
}

export async function deleteExercise(
  exerciseId: string,
  planId: string,
): Promise<ActionResult> {
  try {
    const supabase = await assertAdmin();
    const { error } = await supabase.from('exercises').delete().eq('id', exerciseId);
    if (error) return { ok: false, message: 'Não foi possível excluir o exercício.' };
    revalidatePath(`/admin/fichas/${planId}`);
    return { ok: true };
  } catch (err) {
    return fail(err);
  }
}

/** Reordena os exercícios de um dia conforme a sequência recebida. */
export async function reorderExercises(
  planId: string,
  orderedIds: string[],
): Promise<ActionResult> {
  try {
    const supabase = await assertAdmin();
    await Promise.all(
      orderedIds.map((id, index) =>
        supabase.from('exercises').update({ sort_order: index }).eq('id', id),
      ),
    );
    revalidatePath(`/admin/fichas/${planId}`);
    return { ok: true };
  } catch (err) {
    return fail(err);
  }
}
