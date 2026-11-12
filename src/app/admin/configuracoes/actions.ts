'use server';

import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { createClient } from '@/lib/supabase/server';

export interface ActionResult {
  ok: boolean;
  message?: string;
}

async function assertAdmin() {
  const supabase = createClient();
  const { data, error } = await supabase.rpc('is_admin');
  if (error || !data) throw new Error('Acesso negado.');
  return supabase;
}

function refresh() {
  revalidatePath('/admin/configuracoes');
  revalidatePath('/admin/agenda');
  revalidatePath('/agendar');
  revalidatePath('/');
}

// ─── Disponibilidade semanal ────────────────────────────────────────────────

const windowSchema = z
  .object({
    weekday: z.coerce.number().int().min(0).max(6),
    startTime: z.string().regex(/^\d{2}:\d{2}$/, 'Horário inválido.'),
    endTime: z.string().regex(/^\d{2}:\d{2}$/, 'Horário inválido.'),
  })
  .refine((value) => value.endTime > value.startTime, {
    message: 'O fim precisa ser depois do início.',
  });

export async function addAvailability(input: {
  weekday: number;
  startTime: string;
  endTime: string;
}): Promise<ActionResult> {
  try {
    const supabase = await assertAdmin();
    const parsed = windowSchema.safeParse(input);
    if (!parsed.success) {
      return { ok: false, message: parsed.error.issues[0]?.message ?? 'Dados inválidos.' };
    }

    const { error } = await supabase.from('availability').insert({
      weekday: parsed.data.weekday,
      start_time: parsed.data.startTime,
      end_time: parsed.data.endTime,
    });

    if (error) return { ok: false, message: 'Não foi possível adicionar a janela.' };
    refresh();
    return { ok: true };
  } catch (err) {
    return { ok: false, message: err instanceof Error ? err.message : 'Erro inesperado.' };
  }
}

export async function toggleAvailability(
  id: string,
  active: boolean,
): Promise<ActionResult> {
  try {
    const supabase = await assertAdmin();
    const { error } = await supabase.from('availability').update({ active }).eq('id', id);
    if (error) return { ok: false, message: 'Não foi possível atualizar a janela.' };
    refresh();
    return { ok: true };
  } catch (err) {
    return { ok: false, message: err instanceof Error ? err.message : 'Erro inesperado.' };
  }
}

export async function removeAvailability(id: string): Promise<ActionResult> {
  try {
    const supabase = await assertAdmin();
    const { error } = await supabase.from('availability').delete().eq('id', id);
    if (error) return { ok: false, message: 'Não foi possível remover a janela.' };
    refresh();
    return { ok: true };
  } catch (err) {
    return { ok: false, message: err instanceof Error ? err.message : 'Erro inesperado.' };
  }
}

// ─── Regras de agendamento ──────────────────────────────────────────────────

const rulesSchema = z.object({
  defaultSessionMinutes: z.coerce.number().int().min(15).max(240),
  bufferMinutes: z.coerce.number().int().min(0).max(120),
  minHoursToCancel: z.coerce.number().int().min(0).max(168),
  bookingHorizonDays: z.coerce.number().int().min(1).max(180),
});

export async function updateBookingRules(input: {
  defaultSessionMinutes: number | string;
  bufferMinutes: number | string;
  minHoursToCancel: number | string;
  bookingHorizonDays: number | string;
}): Promise<ActionResult> {
  try {
    const supabase = await assertAdmin();
    const parsed = rulesSchema.safeParse(input);
    if (!parsed.success) {
      return { ok: false, message: parsed.error.issues[0]?.message ?? 'Dados inválidos.' };
    }

    const { data: settings } = await supabase
      .from('personal_settings')
      .select('id')
      .limit(1)
      .maybeSingle();

    if (!settings) return { ok: false, message: 'Configurações não encontradas.' };

    const { error } = await supabase
      .from('personal_settings')
      .update({
        default_session_minutes: parsed.data.defaultSessionMinutes,
        buffer_minutes: parsed.data.bufferMinutes,
        min_hours_to_cancel: parsed.data.minHoursToCancel,
        booking_horizon_days: parsed.data.bookingHorizonDays,
      })
      .eq('id', settings.id);

    if (error) return { ok: false, message: 'Não foi possível salvar as regras.' };
    refresh();
    return { ok: true };
  } catch (err) {
    return { ok: false, message: err instanceof Error ? err.message : 'Erro inesperado.' };
  }
}

// ─── Serviços ───────────────────────────────────────────────────────────────

const serviceSchema = z.object({
  id: z.string().uuid().optional(),
  name: z.string().trim().min(2, 'Informe o nome do serviço.').max(120),
  description: z.string().trim().max(1000).nullable().optional(),
  benefits: z.array(z.string().trim().max(120)).max(10).optional(),
  durationMinutes: z.coerce.number().int().min(15).max(240),
  bookable: z.boolean(),
});

export async function upsertService(input: {
  id?: string;
  name: string;
  description?: string | null;
  benefits?: string[];
  durationMinutes: number | string;
  bookable: boolean;
}): Promise<ActionResult> {
  try {
    const supabase = await assertAdmin();
    const parsed = serviceSchema.safeParse(input);
    if (!parsed.success) {
      return { ok: false, message: parsed.error.issues[0]?.message ?? 'Dados inválidos.' };
    }

    const values = {
      name: parsed.data.name,
      description: parsed.data.description || null,
      benefits: (parsed.data.benefits ?? []).filter(Boolean),
      duration_minutes: parsed.data.durationMinutes,
      bookable: parsed.data.bookable,
    };

    const { error } = parsed.data.id
      ? await supabase.from('services').update(values).eq('id', parsed.data.id)
      : await supabase.from('services').insert({
          ...values,
          slug: parsed.data.name
            .toLowerCase()
            .normalize('NFD')
            .replace(/[̀-ͯ]/g, '')
            .replace(/[^a-z0-9]+/g, '-')
            .replace(/^-|-$/g, '')
            .slice(0, 60),
        });

    if (error) {
      return {
        ok: false,
        message:
          error.code === '23505'
            ? 'Já existe um serviço com esse nome.'
            : 'Não foi possível salvar o serviço.',
      };
    }

    refresh();
    revalidatePath('/admin/treinamentos');
    return { ok: true };
  } catch (err) {
    return { ok: false, message: err instanceof Error ? err.message : 'Erro inesperado.' };
  }
}

export async function deleteService(id: string): Promise<ActionResult> {
  try {
    const supabase = await assertAdmin();
    const { error } = await supabase.from('services').delete().eq('id', id);
    if (error) return { ok: false, message: 'Não foi possível excluir o serviço.' };
    refresh();
    revalidatePath('/admin/treinamentos');
    return { ok: true };
  } catch (err) {
    return { ok: false, message: err instanceof Error ? err.message : 'Erro inesperado.' };
  }
}
