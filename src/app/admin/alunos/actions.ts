'use server';

import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { createAdminClient, createClient } from '@/lib/supabase/server';
import type { ContractStatus, TrainingLevel } from '@/lib/supabase/database.types';

export interface ActionResult<T = undefined> {
  ok: boolean;
  message?: string;
  data?: T;
}

/** Toda ação do painel confirma a permissão no servidor, não só na rota. */
async function assertAdmin() {
  const supabase = createClient();
  const { data, error } = await supabase.rpc('is_admin');
  if (error || !data) throw new Error('Acesso negado.');
  return supabase;
}

const optionalText = z
  .string()
  .trim()
  .max(500)
  .optional()
  .transform((value) => (value ? value : null));

const studentSchema = z.object({
  full_name: z.string().trim().min(3, 'Informe o nome completo.').max(120),
  email: z
    .string()
    .trim()
    .email('E-mail inválido.')
    .optional()
    .or(z.literal(''))
    .transform((value) => (value ? value.toLowerCase() : null)),
  phone: optionalText,
  birth_date: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .optional()
    .or(z.literal(''))
    .transform((value) => (value ? value : null)),
  cpf: optionalText,
  joined_at: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  main_goal: optionalText,
  training_level: z.enum(['beginner', 'intermediate', 'advanced']),
  plan_name: optionalText,
  monthly_fee: z
    .string()
    .optional()
    .transform((value) => {
      if (!value) return null;
      const parsed = Number(value.replace(',', '.'));
      return Number.isFinite(parsed) && parsed >= 0 ? parsed : null;
    }),
  due_day: z
    .string()
    .optional()
    .transform((value) => {
      if (!value) return null;
      const parsed = Number(value);
      return Number.isInteger(parsed) && parsed >= 1 && parsed <= 31 ? parsed : null;
    }),
  contract_status: z.enum(['active', 'paused', 'inactive', 'archived']),
  notes: z.string().trim().max(2000).optional().transform((v) => (v ? v : null)),
  emergency_contact_name: optionalText,
  emergency_contact_phone: optionalText,
  photo_consent: z.coerce.boolean().optional(),
  lgpd_consent: z.coerce.boolean().optional(),
});

function parseStudentForm(formData: FormData) {
  return studentSchema.safeParse({
    full_name: formData.get('full_name') ?? '',
    email: formData.get('email') ?? '',
    phone: formData.get('phone') ?? '',
    birth_date: formData.get('birth_date') ?? '',
    cpf: formData.get('cpf') ?? '',
    joined_at: formData.get('joined_at') ?? '',
    main_goal: formData.get('main_goal') ?? '',
    training_level: (formData.get('training_level') as TrainingLevel) ?? 'beginner',
    plan_name: formData.get('plan_name') ?? '',
    monthly_fee: formData.get('monthly_fee') ?? '',
    due_day: formData.get('due_day') ?? '',
    contract_status: (formData.get('contract_status') as ContractStatus) ?? 'active',
    notes: formData.get('notes') ?? '',
    emergency_contact_name: formData.get('emergency_contact_name') ?? '',
    emergency_contact_phone: formData.get('emergency_contact_phone') ?? '',
    photo_consent: formData.get('photo_consent') === 'on',
    lgpd_consent: formData.get('lgpd_consent') === 'on',
  });
}

export async function createStudent(formData: FormData): Promise<ActionResult<{ id: string }>> {
  try {
    const supabase = await assertAdmin();
    const parsed = parseStudentForm(formData);
    if (!parsed.success) {
      return { ok: false, message: parsed.error.issues[0]?.message ?? 'Dados inválidos.' };
    }

    const { photo_consent, lgpd_consent, ...values } = parsed.data;

    const { data, error } = await supabase
      .from('students')
      .insert({
        ...values,
        photo_consent: Boolean(photo_consent),
        lgpd_consent_at: lgpd_consent ? new Date().toISOString() : null,
      })
      .select('id')
      .single();

    if (error) {
      if (error.code === '23505') {
        return { ok: false, message: 'Já existe um aluno com este CPF.' };
      }
      return { ok: false, message: 'Não foi possível salvar o aluno.' };
    }

    revalidatePath('/admin/alunos');
    revalidatePath('/admin');
    return { ok: true, data: { id: data.id } };
  } catch (err) {
    return { ok: false, message: err instanceof Error ? err.message : 'Erro inesperado.' };
  }
}

export async function updateStudent(
  studentId: string,
  formData: FormData,
): Promise<ActionResult> {
  try {
    const supabase = await assertAdmin();
    const parsed = parseStudentForm(formData);
    if (!parsed.success) {
      return { ok: false, message: parsed.error.issues[0]?.message ?? 'Dados inválidos.' };
    }

    const { photo_consent, lgpd_consent, ...values } = parsed.data;

    const { data: current } = await supabase
      .from('students')
      .select('lgpd_consent_at')
      .eq('id', studentId)
      .maybeSingle();

    const { error } = await supabase
      .from('students')
      .update({
        ...values,
        photo_consent: Boolean(photo_consent),
        lgpd_consent_at: lgpd_consent
          ? (current?.lgpd_consent_at ?? new Date().toISOString())
          : null,
      })
      .eq('id', studentId);

    if (error) {
      if (error.code === '23505') {
        return { ok: false, message: 'Já existe um aluno com este CPF.' };
      }
      return { ok: false, message: 'Não foi possível salvar as alterações.' };
    }

    revalidatePath('/admin/alunos');
    revalidatePath(`/admin/alunos/${studentId}`);
    return { ok: true };
  } catch (err) {
    return { ok: false, message: err instanceof Error ? err.message : 'Erro inesperado.' };
  }
}

export async function setStudentStatus(
  studentId: string,
  status: ContractStatus,
): Promise<ActionResult> {
  try {
    const supabase = await assertAdmin();
    const { error } = await supabase
      .from('students')
      .update({ contract_status: status })
      .eq('id', studentId);

    if (error) return { ok: false, message: 'Não foi possível alterar a situação.' };

    revalidatePath('/admin/alunos');
    revalidatePath(`/admin/alunos/${studentId}`);
    return { ok: true };
  } catch (err) {
    return { ok: false, message: err instanceof Error ? err.message : 'Erro inesperado.' };
  }
}

/**
 * Cria a conta de acesso do aluno.
 *
 * Usa a chave de serviço (apenas no servidor, após checar a permissão) para
 * convidar o aluno por e-mail. O aluno define a própria senha pelo link —
 * o personal nunca vê nem escolhe a senha de ninguém.
 */
export async function inviteStudent(studentId: string): Promise<ActionResult> {
  try {
    const supabase = await assertAdmin();

    const { data: student } = await supabase
      .from('students')
      .select('id, full_name, email, profile_id')
      .eq('id', studentId)
      .maybeSingle();

    if (!student) return { ok: false, message: 'Aluno não encontrado.' };
    if (!student.email) {
      return {
        ok: false,
        message: 'Cadastre o e-mail do aluno antes de enviar o convite.',
      };
    }
    if (student.profile_id) {
      return { ok: false, message: 'Este aluno já tem conta de acesso.' };
    }

    let admin;
    try {
      admin = createAdminClient();
    } catch (err) {
      return {
        ok: false,
        message:
          err instanceof Error
            ? err.message
            : 'Chave de serviço do Supabase não configurada.',
      };
    }

    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? '';
    const { data, error } = await admin.auth.admin.inviteUserByEmail(student.email, {
      data: { full_name: student.full_name, role: 'student' },
      redirectTo: siteUrl ? `${siteUrl}/nova-senha` : undefined,
    });

    if (error) {
      return {
        ok: false,
        message:
          error.message.includes('already registered')
            ? 'Já existe uma conta com este e-mail. Peça ao aluno para entrar com ela.'
            : 'Não foi possível enviar o convite agora.',
      };
    }

    // Vincula imediatamente o cadastro à conta criada.
    if (data.user) {
      await supabase
        .from('students')
        .update({ profile_id: data.user.id })
        .eq('id', studentId);
    }

    revalidatePath(`/admin/alunos/${studentId}`);
    return { ok: true, message: `Convite enviado para ${student.email}.` };
  } catch (err) {
    return { ok: false, message: err instanceof Error ? err.message : 'Erro inesperado.' };
  }
}
