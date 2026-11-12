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

const text = (max: number) =>
  z
    .string()
    .trim()
    .max(max)
    .nullable()
    .optional()
    .transform((value) => value || null);

const profileSchema = z.object({
  professionalName: z.string().trim().min(2, 'Informe o nome profissional.').max(120),
  headline: text(200),
  bio: text(4000),
  methodology: text(2000),
  experience: text(2000),
  philosophy: text(2000),
  specialties: z.array(z.string().trim().max(80)).max(20),
  certifications: z.array(z.string().trim().max(120)).max(20),
  differentials: z.array(z.string().trim().max(120)).max(20),
  photoUrl: text(500),
  logoUrl: text(500),
  whatsapp: text(30),
  instagram: text(60),
  publicEmail: text(160),
  gymName: z.string().trim().min(1).max(120),
  gymAddress: text(300),
  gymCity: z.string().trim().min(1).max(120),
  gymMapsUrl: text(500),
  attendanceNotes: text(500),
});

export interface ProfileInput {
  professionalName: string;
  headline?: string | null;
  bio?: string | null;
  methodology?: string | null;
  experience?: string | null;
  philosophy?: string | null;
  specialties: string[];
  certifications: string[];
  differentials: string[];
  photoUrl?: string | null;
  logoUrl?: string | null;
  whatsapp?: string | null;
  instagram?: string | null;
  publicEmail?: string | null;
  gymName: string;
  gymAddress?: string | null;
  gymCity: string;
  gymMapsUrl?: string | null;
  attendanceNotes?: string | null;
}

/**
 * Salva as informações profissionais exibidas no site institucional.
 * Todo o conteúdo é escrito pelo próprio Patrick — a plataforma nunca
 * preenche biografia, certificações ou experiência automaticamente.
 */
export async function updatePersonalProfile(input: ProfileInput): Promise<ActionResult> {
  try {
    const supabase = await assertAdmin();
    const parsed = profileSchema.safeParse(input);
    if (!parsed.success) {
      return { ok: false, message: parsed.error.issues[0]?.message ?? 'Dados inválidos.' };
    }

    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return { ok: false, message: 'Sessão expirada.' };

    const { data: settings } = await supabase
      .from('personal_settings')
      .select('id')
      .limit(1)
      .maybeSingle();

    const values = {
      profile_id: user.id,
      professional_name: parsed.data.professionalName,
      headline: parsed.data.headline,
      bio: parsed.data.bio,
      methodology: parsed.data.methodology,
      experience: parsed.data.experience,
      philosophy: parsed.data.philosophy,
      specialties: parsed.data.specialties.filter(Boolean),
      certifications: parsed.data.certifications.filter(Boolean),
      differentials: parsed.data.differentials.filter(Boolean),
      photo_url: parsed.data.photoUrl,
      logo_url: parsed.data.logoUrl,
      whatsapp: parsed.data.whatsapp,
      instagram: parsed.data.instagram,
      public_email: parsed.data.publicEmail,
      gym_name: parsed.data.gymName,
      gym_address: parsed.data.gymAddress,
      gym_city: parsed.data.gymCity,
      gym_maps_url: parsed.data.gymMapsUrl,
      attendance_notes: parsed.data.attendanceNotes,
    };

    const { error } = settings
      ? await supabase.from('personal_settings').update(values).eq('id', settings.id)
      : await supabase.from('personal_settings').insert(values);

    if (error) return { ok: false, message: 'Não foi possível salvar o perfil.' };

    // Mantém o nome do perfil de autenticação em sincronia.
    await supabase
      .from('profiles')
      .update({ full_name: parsed.data.professionalName })
      .eq('id', user.id);

    revalidatePath('/admin/perfil');
    revalidatePath('/');
    return { ok: true };
  } catch (err) {
    return { ok: false, message: err instanceof Error ? err.message : 'Erro inesperado.' };
  }
}

/** Troca de senha do próprio personal. */
export async function changePassword(newPassword: string): Promise<ActionResult> {
  try {
    const supabase = await assertAdmin();
    if (newPassword.length < 8) {
      return { ok: false, message: 'A senha precisa ter pelo menos 8 caracteres.' };
    }
    const { error } = await supabase.auth.updateUser({ password: newPassword });
    if (error) return { ok: false, message: 'Não foi possível alterar a senha.' };
    return { ok: true, message: 'Senha alterada.' };
  } catch (err) {
    return { ok: false, message: err instanceof Error ? err.message : 'Erro inesperado.' };
  }
}
