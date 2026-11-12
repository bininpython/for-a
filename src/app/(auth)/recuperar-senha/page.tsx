'use client';

import { useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, MailCheck, Send } from 'lucide-react';
import { Field, SubmitButton } from '@/components/ui/Field';
import { createClient } from '@/lib/supabase/client';
import { supabaseConfigured } from '@/lib/supabase/env';
import { SetupNotice } from '@/components/ui/SetupNotice';

export default function RecoverPasswordPage() {
  const [email, setEmail] = useState('');
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  if (!supabaseConfigured) {
    return <SetupNotice context="A recuperação de senha depende do Supabase Auth." />;
  }

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setPending(true);

    try {
      const supabase = createClient();
      const { error: authError } = await supabase.auth.resetPasswordForEmail(
        email.trim(),
        { redirectTo: `${window.location.origin}/nova-senha` },
      );
      if (authError) {
        setError('Não foi possível enviar o e-mail agora. Tente novamente em instantes.');
        return;
      }
      setSent(true);
    } catch {
      setError('Falha de conexão. Verifique sua internet e tente novamente.');
    } finally {
      setPending(false);
    }
  }

  if (sent) {
    return (
      <div className="hpe-card p-7 text-center sm:p-8">
        <span className="mx-auto inline-flex h-12 w-12 items-center justify-center rounded-xl border border-hpe-orange/30 bg-hpe-orange/10">
          <MailCheck className="h-5 w-5 text-hpe-orange" />
        </span>
        <h1 className="hpe-display mt-5 text-xl">Verifique seu e-mail</h1>
        <p className="mt-3 text-sm leading-relaxed text-hpe-muted">
          Se <strong className="text-hpe-white">{email}</strong> estiver cadastrado, o
          link para criar uma nova senha chega em alguns minutos. Confira também a
          caixa de spam.
        </p>
        <Link href="/entrar" className="hpe-btn-ghost mt-7 w-full">
          <ArrowLeft className="h-4 w-4" />
          Voltar ao login
        </Link>
      </div>
    );
  }

  return (
    <div className="hpe-card p-7 sm:p-8">
      <h1 className="hpe-display text-2xl">Recuperar senha</h1>
      <p className="mt-2 text-sm text-hpe-muted">
        Informe o e-mail da sua conta e enviaremos um link para criar uma nova senha.
      </p>

      <form onSubmit={onSubmit} className="mt-7 space-y-5" noValidate>
        <Field label="E-mail" htmlFor="email" required>
          <input
            id="email"
            type="email"
            autoComplete="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="voce@email.com"
            className="hpe-input"
          />
        </Field>

        {error ? (
          <p
            role="alert"
            className="rounded-xl border border-red-500/25 bg-red-500/[0.07] px-4 py-3 text-sm text-red-300"
          >
            {error}
          </p>
        ) : null}

        <SubmitButton pending={pending} pendingLabel="Enviando…" className="w-full">
          <Send className="h-4 w-4" />
          Enviar link
        </SubmitButton>
      </form>

      <Link
        href="/entrar"
        className="mt-6 inline-flex items-center gap-2 border-t border-white/[0.07] pt-6 text-sm text-hpe-muted transition-colors hover:text-hpe-white"
      >
        <ArrowLeft className="h-4 w-4" />
        Voltar ao login
      </Link>
    </div>
  );
}
