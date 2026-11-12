'use server';

import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { createClient } from '@/lib/supabase/server';

export interface ActionResult {
  ok: boolean;
  message?: string;
}

const profileSchema = z.object({
  phone: z
    .string()
    .trim()
    .max(30)
    .nullable()
    .optional()
    .transform((value) => value || null),
  photoUrl: z
    .string()
    .trim()
    .max(500)
    .nullable()
    .optional()
    .transform((value) => value || null),
  emergencyContactName: z
    .string()
    .trim()
    .max(120)
    .nullable()
    .optional()
    .transform((value) => value || null),
  emergencyContactPhone: z
    .string()
    .trim()
    .max(30)
    .nullable()
    .optional()
    .transform((value) => value || null),
  photoConsent: z.boolean(),
});

/**
 * O aluno edita apenas os próprios dados de contato e a autorização de
 * fotografias. Objetivo, plano, valores e situação do contrato continuam sob
 * responsabilidade do personal — a política RLS permite o update, mas estes
 * campos simplesmente não são enviados por esta ação.
 */
export async function updateMyProfile(input: {
  phone?: string | null;
  photoUrl?: string | null;
  emergencyContactName?: string | null;
  emergencyContactPhone?: string | null;
  photoConsent: boolean;
}): Promise<ActionResult> {
  try {
    const parsed = profileSchema.safeParse(input);
    if (!parsed.success) {
      return { ok: false, message: parsed.error.issues[0]?.message ?? 'Dados inválidos.' };
    }

    const supabase = createClient();
    const { data: studentId } = await supabase.rpc('current_student_id');
    if (!studentId) {
      return { ok: false, message: 'Sua conta não está vinculada a um cadastro.' };
    }

    const { error } = await supabase
      .from('students')
      .update({
        phone: parsed.data.phone,
        photo_url: parsed.data.photoUrl,
        emergency_contact_name: parsed.data.emergencyContactName,
        emergency_contact_phone: parsed.data.emergencyContactPhone,
        photo_consent: parsed.data.photoConsent,
      })
      .eq('id', studentId);

    if (error) return { ok: false, message: 'Não foi possível salvar o perfil.' };

    revalidatePath('/aluno/perfil');
    revalidatePath('/aluno');
    return { ok: true };
  } catch (err) {
    return { ok: false, message: err instanceof Error ? err.message : 'Erro inesperado.' };
  }
}

export async function changeMyPassword(newPassword: string): Promise<ActionResult> {
  if (newPassword.length < 8) {
    return { ok: false, message: 'A senha precisa ter pelo menos 8 caracteres.' };
  }
  const supabase = createClient();
  const { error } = await supabase.auth.updateUser({ password: newPassword });
  if (error) return { ok: false, message: 'Não foi possível alterar a senha.' };
  return { ok: true, message: 'Senha alterada.' };
}
