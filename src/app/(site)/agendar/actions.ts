'use server';

import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { createClient } from '@/lib/supabase/server';
import { supabaseConfigured } from '@/lib/supabase/env';
import type { AvailableSlot } from '@/lib/supabase/database.types';

export interface ActionResult<T = undefined> {
  ok: boolean;
  message?: string;
  data?: T;
}

const slotsSchema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Data inválida.'),
  serviceId: z.string().uuid().nullable().optional(),
});

/** Horários livres de um dia — sempre calculados pelo banco. */
export async function fetchSlots(
  date: string,
  serviceId: string | null,
): Promise<ActionResult<AvailableSlot[]>> {
  if (!supabaseConfigured) {
    return { ok: false, message: 'Banco de dados não configurado.' };
  }

  const parsed = slotsSchema.safeParse({ date, serviceId });
  if (!parsed.success) {
    return { ok: false, message: parsed.error.issues[0]?.message ?? 'Dados inválidos.' };
  }

  const supabase = createClient();
  const { data, error } = await supabase.rpc('available_slots', {
    p_date: parsed.data.date,
    p_service_id: parsed.data.serviceId ?? null,
  });

  if (error) {
    return { ok: false, message: 'Não foi possível consultar a agenda agora.' };
  }

  return { ok: true, data: data ?? [] };
}

const bookSchema = z.object({
  serviceId: z.string().uuid().nullable(),
  startsAt: z.string().datetime({ offset: true }),
  notes: z.string().trim().max(500).optional().nullable(),
});

/**
 * Cria o agendamento pela função `book_appointment`, que revalida a
 * disponibilidade e usa a constraint de exclusão para impedir que dois
 * pedidos simultâneos ocupem o mesmo horário.
 */
export async function bookAppointment(input: {
  serviceId: string | null;
  startsAt: string;
  notes?: string | null;
}): Promise<ActionResult<{ id: string; startsAt: string }>> {
  if (!supabaseConfigured) {
    return { ok: false, message: 'Banco de dados não configurado.' };
  }

  const parsed = bookSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, message: 'Dados do agendamento inválidos.' };
  }

  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return {
      ok: false,
      message: 'Entre na sua conta para confirmar o agendamento.',
    };
  }

  const { data, error } = await supabase.rpc('book_appointment', {
    p_service_id: parsed.data.serviceId,
    p_starts_at: parsed.data.startsAt,
    p_student_notes: parsed.data.notes ?? null,
  });

  if (error) {
    // Mensagens de negócio vêm prontas da função SQL.
    return { ok: false, message: error.message || 'Não foi possível agendar.' };
  }

  revalidatePath('/agendar');
  revalidatePath('/aluno');
  revalidatePath('/aluno/agendamentos');

  const appointment = data as unknown as { id: string; starts_at: string };
  return {
    ok: true,
    data: { id: appointment.id, startsAt: appointment.starts_at },
  };
}
