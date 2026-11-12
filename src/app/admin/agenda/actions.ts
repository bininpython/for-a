'use server';

import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { createClient } from '@/lib/supabase/server';
import type { AppointmentStatus, AvailableSlot } from '@/lib/supabase/database.types';

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
  revalidatePath('/admin/agenda');
  revalidatePath('/admin');
  revalidatePath('/aluno');
  revalidatePath('/aluno/agendamentos');
}

/** Confirmar, concluir, registrar falta. */
export async function setAppointmentStatus(
  appointmentId: string,
  status: Exclude<AppointmentStatus, 'cancelled'>,
): Promise<ActionResult> {
  try {
    const supabase = await assertAdmin();
    const { error } = await supabase
      .from('appointments')
      .update({ status })
      .eq('id', appointmentId);

    if (error) {
      return {
        ok: false,
        message:
          error.code === '23P01'
            ? 'Há outro atendimento ocupando este horário.'
            : 'Não foi possível atualizar o atendimento.',
      };
    }
    refresh();
    return { ok: true };
  } catch (err) {
    return { ok: false, message: err instanceof Error ? err.message : 'Erro inesperado.' };
  }
}

export async function cancelAppointment(
  appointmentId: string,
  reason?: string,
): Promise<ActionResult> {
  try {
    const supabase = await assertAdmin();
    const { error } = await supabase.rpc('cancel_appointment', {
      p_appointment_id: appointmentId,
      p_reason: reason ?? null,
    });
    if (error) return { ok: false, message: error.message || 'Não foi possível cancelar.' };
    refresh();
    return { ok: true };
  } catch (err) {
    return { ok: false, message: err instanceof Error ? err.message : 'Erro inesperado.' };
  }
}

const manualSchema = z.object({
  studentId: z.string().uuid('Selecione o aluno.'),
  serviceId: z.string().uuid().nullable(),
  startsAt: z.string().datetime({ offset: true }),
  notes: z.string().trim().max(500).optional().nullable(),
});

/** Atendimento criado pelo personal — já nasce confirmado. */
export async function createAppointment(input: {
  studentId: string;
  serviceId: string | null;
  startsAt: string;
  notes?: string | null;
}): Promise<ActionResult> {
  try {
    await assertAdmin();
    const parsed = manualSchema.safeParse(input);
    if (!parsed.success) {
      return { ok: false, message: parsed.error.issues[0]?.message ?? 'Dados inválidos.' };
    }

    const supabase = createClient();
    const { error } = await supabase.rpc('book_appointment', {
      p_service_id: parsed.data.serviceId,
      p_starts_at: parsed.data.startsAt,
      p_student_notes: parsed.data.notes ?? null,
      p_student_id: parsed.data.studentId,
    });

    if (error) {
      return { ok: false, message: error.message || 'Não foi possível criar o atendimento.' };
    }
    refresh();
    return { ok: true };
  } catch (err) {
    return { ok: false, message: err instanceof Error ? err.message : 'Erro inesperado.' };
  }
}

/** Reagendamento: valida o novo horário pela mesma constraint de exclusão. */
export async function rescheduleAppointment(
  appointmentId: string,
  startsAt: string,
): Promise<ActionResult> {
  try {
    const supabase = await assertAdmin();

    const { data: current } = await supabase
      .from('appointments')
      .select('starts_at, ends_at')
      .eq('id', appointmentId)
      .maybeSingle();

    if (!current) return { ok: false, message: 'Atendimento não encontrado.' };

    const durationMs =
      new Date(current.ends_at).getTime() - new Date(current.starts_at).getTime();
    const endsAt = new Date(new Date(startsAt).getTime() + durationMs).toISOString();

    const { error } = await supabase
      .from('appointments')
      .update({ starts_at: startsAt, ends_at: endsAt, status: 'confirmed' })
      .eq('id', appointmentId);

    if (error) {
      return {
        ok: false,
        message:
          error.code === '23P01'
            ? 'Já existe atendimento nesse horário.'
            : 'Não foi possível reagendar.',
      };
    }
    refresh();
    return { ok: true };
  } catch (err) {
    return { ok: false, message: err instanceof Error ? err.message : 'Erro inesperado.' };
  }
}

const blockSchema = z
  .object({
    startsAt: z.string().datetime({ offset: true }),
    endsAt: z.string().datetime({ offset: true }),
    reason: z.string().trim().max(200).optional().nullable(),
    allDay: z.boolean().optional(),
  })
  .refine((value) => new Date(value.endsAt) > new Date(value.startsAt), {
    message: 'O fim do bloqueio deve ser depois do início.',
  });

export async function createBlock(input: {
  startsAt: string;
  endsAt: string;
  reason?: string | null;
  allDay?: boolean;
}): Promise<ActionResult> {
  try {
    const supabase = await assertAdmin();
    const parsed = blockSchema.safeParse(input);
    if (!parsed.success) {
      return { ok: false, message: parsed.error.issues[0]?.message ?? 'Dados inválidos.' };
    }

    const { error } = await supabase.from('blocked_times').insert({
      starts_at: parsed.data.startsAt,
      ends_at: parsed.data.endsAt,
      reason: parsed.data.reason ?? null,
      all_day: Boolean(parsed.data.allDay),
    });

    if (error) return { ok: false, message: 'Não foi possível criar o bloqueio.' };
    refresh();
    return { ok: true };
  } catch (err) {
    return { ok: false, message: err instanceof Error ? err.message : 'Erro inesperado.' };
  }
}

export async function removeBlock(blockId: string): Promise<ActionResult> {
  try {
    const supabase = await assertAdmin();
    const { error } = await supabase.from('blocked_times').delete().eq('id', blockId);
    if (error) return { ok: false, message: 'Não foi possível remover o bloqueio.' };
    refresh();
    return { ok: true };
  } catch (err) {
    return { ok: false, message: err instanceof Error ? err.message : 'Erro inesperado.' };
  }
}

/** Horários livres de um dia, para o formulário de atendimento manual. */
export async function adminSlots(
  date: string,
  serviceId: string | null,
): Promise<ActionResult<AvailableSlot[]>> {
  try {
    const supabase = await assertAdmin();
    const { data, error } = await supabase.rpc('available_slots', {
      p_date: date,
      p_service_id: serviceId,
    });
    if (error) return { ok: false, message: 'Não foi possível consultar a agenda.' };
    return { ok: true, data: data ?? [] };
  } catch (err) {
    return { ok: false, message: err instanceof Error ? err.message : 'Erro inesperado.' };
  }
}
