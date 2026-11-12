'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { KeyRound, ShieldCheck } from 'lucide-react';
import { Field, SubmitButton } from '@/components/ui/Field';
import { createClient } from '@/lib/supabase/client';
import { supabaseConfigured } from '@/lib/supabase/env';
import { SetupNotice } from '@/components/ui/SetupNotice';

const MIN_LENGTH = 8;

export default function NewPasswordPage() {
  const router = useRouter();
  const [ready, setReady] = useState(false);
  const [password, setPassword] = useState('');
  const [confirmation, setConfirmation] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  // O link de recuperação chega com a sessão no fragmento da URL;
  // o cliente do Supabase a processa automaticamente.
  useEffect(() => {
    if (!supabaseConfigured) return;
    const supabase = createClient();
    supabase.auth.getSession().then(({ data }) => {
      setReady(Boolean(data.session));
    });
    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session) setReady(true);
    });
    return () => listener.subscription.unsubscribe();
  }, []);

  if (!supabaseConfigured) {
    return <SetupNotice context="A redefinição de senha depende do Supabase Auth." />;
  }

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);

    if (password.length < MIN_LENGTH) {
      setError(`A senha precisa ter pelo menos ${MIN_LENGTH} caracteres.`);
      return;
    }
    if (password !== confirmation) {
      setError('As senhas não conferem.');
      return;
    }

    setPending(true);
    try {
      const supabase = createClient();
      const { error: authError } = await supabase.auth.updateUser({ password });
      if (authError) {
        setError('Não foi possível alterar a senha. Solicite um novo link e tente de novo.');
        return;
      }

      const {
        data: { user },
      } = await supabase.auth.getUser();
      const { data: profile } = user
        ? await supabase.from('profiles').select('role').eq('id', user.id).maybeSingle()
        : { data: null };

      router.replace(profile?.role === 'admin' ? '/admin' : '/aluno');
      router.refresh();
    } catch {
      setError('Falha de conexão. Tente novamente.');
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="hpe-card p-7 sm:p-8">
      <h1 className="hpe-display text-2xl">Criar nova senha</h1>
      <p className="mt-2 text-sm text-hpe-muted">
        Escolha uma senha com pelo menos {MIN_LENGTH} caracteres.
      </p>

      {!ready ? (
        <p className="mt-6 rounded-xl border border-white/10 bg-white/[0.03] px-4 py-3 text-sm text-hpe-muted">
          Validando o link de recuperação… Se esta mensagem permanecer, o link pode
          ter expirado. Solicite um novo em <strong>Esqueci minha senha</strong>.
        </p>
      ) : null}

      <form onSubmit={onSubmit} className="mt-7 space-y-5" noValidate>
        <Field label="Nova senha" htmlFor="password" required>
          <input
            id="password"
            type="password"
            autoComplete="new-password"
            required
            minLength={MIN_LENGTH}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="hpe-input"
            disabled={!ready}
          />
        </Field>

        <Field label="Confirmar nova senha" htmlFor="confirmation" required>
          <input
            id="confirmation"
            type="password"
            autoComplete="new-password"
            required
            value={confirmation}
            onChange={(e) => setConfirmation(e.target.value)}
            className="hpe-input"
            disabled={!ready}
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

        <SubmitButton
          pending={pending}
          pendingLabel="Salvando…"
          className="w-full"
          disabled={!ready}
        >
          <KeyRound className="h-4 w-4" />
          Salvar nova senha
        </SubmitButton>
      </form>

      <p className="mt-6 flex items-start gap-2 border-t border-white/[0.07] pt-6 text-xs leading-relaxed text-white/35">
        <ShieldCheck className="mt-0.5 h-3.5 w-3.5 shrink-0" />
        Sua senha é armazenada de forma criptografada pelo provedor de autenticação e
        não fica visível para ninguém, nem para o personal.
      </p>
    </div>
  );
}
