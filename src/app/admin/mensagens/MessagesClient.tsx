'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { MessageSquare, Send, Trash2 } from 'lucide-react';
import { Badge } from '@/components/ui/Badge';
import { Field } from '@/components/ui/Field';
import { EmptyState } from '@/components/ui/EmptyState';
import { useToast } from '@/components/ui/Toast';
import { deleteMessage, sendMessage } from './actions';
import { formatDateTime } from '@/lib/utils';

export interface MessageRow {
  id: string;
  subject: string | null;
  body: string;
  created_at: string;
  student_name: string | null;
}

export function MessagesClient({
  messages,
  students,
  integrationsReady,
}: {
  messages: MessageRow[];
  students: { id: string; full_name: string }[];
  integrationsReady: { whatsapp: boolean; email: boolean };
}) {
  const router = useRouter();
  const toast = useToast();
  const [isPending, startTransition] = useTransition();
  const [studentId, setStudentId] = useState('');
  const [subject, setSubject] = useState('');
  const [body, setBody] = useState('');

  function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    startTransition(async () => {
      const result = await sendMessage({
        studentId: studentId || null,
        subject: subject.trim() || null,
        body,
      });
      if (result.ok) {
        toast.success(result.message ?? 'Aviso publicado.');
        setSubject('');
        setBody('');
        router.refresh();
      } else {
        toast.error(result.message ?? 'Não foi possível publicar.');
      }
    });
  }

  return (
    <div className="grid gap-6 xl:grid-cols-[minmax(0,420px)_1fr]">
      {/* ─── Novo aviso ──────────────────────────────────────────────────── */}
      <form onSubmit={submit} className="hpe-card h-fit p-5 sm:p-6">
        <h2 className="hpe-display text-base">Novo aviso</h2>
        <p className="mt-1 text-xs text-hpe-muted">
          Aparece na área do aluno e gera notificação dentro da plataforma.
        </p>

        <div className="mt-5 space-y-5">
          <Field label="Destinatário" htmlFor="msg-student">
            <select
              id="msg-student"
              value={studentId}
              onChange={(e) => setStudentId(e.target.value)}
              className="hpe-select"
            >
              <option value="">Todos os alunos ativos</option>
              {students.map((student) => (
                <option key={student.id} value={student.id}>
                  {student.full_name}
                </option>
              ))}
            </select>
          </Field>

          <Field label="Assunto" htmlFor="msg-subject">
            <input
              id="msg-subject"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              maxLength={120}
              placeholder="Ex.: Mudança de horário na sexta"
              className="hpe-input"
            />
          </Field>

          <Field label="Mensagem" htmlFor="msg-body" required>
            <textarea
              id="msg-body"
              rows={6}
              required
              minLength={2}
              value={body}
              onChange={(e) => setBody(e.target.value)}
              className="hpe-textarea"
            />
          </Field>

          <button
            type="submit"
            disabled={isPending || body.trim().length < 2}
            className="hpe-btn-primary w-full"
          >
            {isPending ? (
              'Publicando…'
            ) : (
              <>
                <Send className="h-4 w-4" />
                Publicar aviso
              </>
            )}
          </button>
        </div>

        <div className="mt-6 space-y-2 border-t border-white/[0.07] pt-5 text-xs leading-relaxed text-hpe-muted">
          <p className="flex items-center gap-2">
            <Badge tone={integrationsReady.whatsapp ? 'green' : 'gray'}>WhatsApp</Badge>
            {integrationsReady.whatsapp
              ? 'Integração configurada.'
              : 'Não configurada — nenhuma mensagem é enviada por WhatsApp.'}
          </p>
          <p className="flex items-center gap-2">
            <Badge tone={integrationsReady.email ? 'green' : 'gray'}>E-mail</Badge>
            {integrationsReady.email
              ? 'Integração configurada.'
              : 'Não configurada — nenhum e-mail é disparado.'}
          </p>
          <p className="text-white/35">
            As variáveis necessárias estão documentadas no README. Até que sejam
            definidas, a plataforma não simula envios externos.
          </p>
        </div>
      </form>

      {/* ─── Histórico ───────────────────────────────────────────────────── */}
      <div>
        <h2 className="mb-4 font-display text-base font-bold uppercase tracking-wide">
          Avisos publicados
        </h2>

        {messages.length === 0 ? (
          <EmptyState
            icon={MessageSquare}
            title="Nenhum aviso publicado"
            description="Use os avisos para comunicar mudanças de horário, lembretes e recados gerais."
          />
        ) : (
          <ul className="space-y-3">
            {messages.map((message) => (
              <li key={message.id} className="hpe-card p-5">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="font-medium">
                      {message.subject ?? 'Aviso do personal'}
                    </p>
                    <p className="mt-0.5 text-xs text-hpe-muted">
                      {message.student_name
                        ? `Para ${message.student_name}`
                        : 'Para todos os alunos'}{' '}
                      · {formatDateTime(message.created_at)}
                    </p>
                  </div>
                  <button
                    type="button"
                    disabled={isPending}
                    onClick={() => {
                      if (!confirm('Excluir este aviso?')) return;
                      startTransition(async () => {
                        const result = await deleteMessage(message.id);
                        if (result.ok) {
                          toast.success('Aviso excluído.');
                          router.refresh();
                        } else {
                          toast.error(result.message ?? 'Não foi possível excluir.');
                        }
                      });
                    }}
                    title="Excluir aviso"
                    className="shrink-0 rounded-lg p-1.5 text-hpe-muted transition-colors hover:text-red-300"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
                <p className="mt-3 whitespace-pre-wrap text-sm leading-relaxed text-hpe-white/90">
                  {message.body}
                </p>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
