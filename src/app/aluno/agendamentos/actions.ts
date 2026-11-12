'use server';

import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { createClient } from '@/lib/supabase/server';

export interface ActionResult {
  ok: boolean;
  message?: string;
}

/**
 * Cancelamento pelo próprio aluno.
 *
 * Quem decide se pode cancelar é a função `cancel_appointment` no banco:
 * ela confere se o agendamento é mesmo deste aluno e se o prazo mínimo de
 * antecedência foi respeitado. O cliente não participa dessa decisão.
 */
export async function cancelMyAppointment(
  appointmentId: string,
  reason?: string,
): Promise<ActionResult> {
  const parsed = z.string().uuid().safeParse(appointmentId);
  if (!parsed.success) return { ok: false, message: 'Agendamento inválido.' };

  const supabase = createClient();
  const { error } = await supabase.rpc('cancel_appointment', {
    p_appointment_id: parsed.data,
    p_reason: reason ?? null,
  });

  if (error) {
    return { ok: false, message: error.message || 'Não foi possível cancelar.' };
  }

  revalidatePath('/aluno');
  revalidatePath('/aluno/agendamentos');
  revalidatePath('/agendar');
  return { ok: true };
}
