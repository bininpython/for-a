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

const messageSchema = z.object({
  studentId: z.string().uuid().nullable(),
  subject: z.string().trim().max(120).nullable().optional(),
  body: z.string().trim().min(2, 'Escreva a mensagem.').max(4000),
});

/**
 * Publica um aviso na plataforma e gera a notificação in-app correspondente.
 *
 * Nada é marcado como enviado por WhatsApp ou e-mail: enquanto as integrações
 * não estiverem configuradas, essas notificações ficam com entrega `skipped`,
 * deixando explícito que não houve envio externo.
 */
export async function sendMessage(input: {
  studentId: string | null;
  subject?: string | null;
  body: string;
}): Promise<ActionResult> {
  try {
    const supabase = await assertAdmin();
    const parsed = messageSchema.safeParse(input);
    if (!parsed.success) {
      return { ok: false, message: parsed.error.issues[0]?.message ?? 'Dados inválidos.' };
    }

    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return { ok: false, message: 'Sessão expirada.' };

    const { error } = await supabase.from('messages').insert({
      author_id: user.id,
      student_id: parsed.data.studentId,
      subject: parsed.data.subject || null,
      body: parsed.data.body,
    });

    if (error) return { ok: false, message: 'Não foi possível publicar o aviso.' };

    // Destinatários: um aluno específico ou todos os ativos com conta.
    let recipients: string[] = [];

    if (parsed.data.studentId) {
      const { data: student } = await supabase
        .from('students')
        .select('profile_id')
        .eq('id', parsed.data.studentId)
        .maybeSingle();
      if (student?.profile_id) recipients = [student.profile_id];
    } else {
      const { data: students } = await supabase
        .from('students')
        .select('profile_id')
        .in('contract_status', ['active', 'paused'])
        .not('profile_id', 'is', null);
      recipients = (students ?? [])
        .map((s) => s.profile_id)
        .filter((id): id is string => Boolean(id));
    }

    if (recipients.length) {
      await supabase.from('notifications').insert(
        recipients.map((profileId) => ({
          profile_id: profileId,
          kind: 'announcement' as const,
          title: parsed.data.subject || 'Aviso do personal',
          body: parsed.data.body.slice(0, 280),
          link: '/aluno',
          channel: 'in_app' as const,
          delivery: 'sent' as const,
        })),
      );
    }

    revalidatePath('/admin/mensagens');
    revalidatePath('/aluno');
    return {
      ok: true,
      message: recipients.length
        ? `Aviso publicado para ${recipients.length} aluno(s) com acesso.`
        : 'Aviso publicado. Nenhum destinatário tem conta de acesso ainda.',
    };
  } catch (err) {
    return { ok: false, message: err instanceof Error ? err.message : 'Erro inesperado.' };
  }
}

export async function deleteMessage(messageId: string): Promise<ActionResult> {
  try {
    const supabase = await assertAdmin();
    const { error } = await supabase.from('messages').delete().eq('id', messageId);
    if (error) return { ok: false, message: 'Não foi possível excluir o aviso.' };
    revalidatePath('/admin/mensagens');
    return { ok: true };
  } catch (err) {
    return { ok: false, message: err instanceof Error ? err.message : 'Erro inesperado.' };
  }
}
