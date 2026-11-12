'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Eye, EyeOff, LogIn } from 'lucide-react';
import { Field, SubmitButton } from '@/components/ui/Field';
import { createClient } from '@/lib/supabase/client';

const MESSAGES: Record<string, string> = {
  'Invalid login credentials': 'E-mail ou senha incorretos.',
  'Email not confirmed': 'Confirme seu e-mail antes de entrar. Verifique a caixa de entrada.',
};

export function LoginForm({ next }: { next?: string }) {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setPending(true);

    try {
      const supabase = createClient();
      const { data, error: authError } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password,
      });

      if (authError) {
        setError(MESSAGES[authError.message] ?? 'Não foi possível entrar. Tente novamente.');
        return;
      }

      const { data: profile } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', data.user.id)
        .maybeSingle();

      const destination = next || (profile?.role === 'admin' ? '/admin' : '/aluno');
      router.replace(destination);
      router.refresh();
    } catch {
      setError('Falha de conexão. Verifique sua internet e tente novamente.');
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="hpe-card p-7 sm:p-8">
      <h1 className="hpe-display text-2xl">Acessar a plataforma</h1>
      <p className="mt-2 text-sm text-hpe-muted">
        Área do aluno e painel do personal.
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

        <Field label="Senha" htmlFor="password" required>
          <div className="relative">
            <input
              id="password"
              type={showPassword ? 'text' : 'password'}
              autoComplete="current-password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              className="hpe-input pr-12"
            />
            <button
              type="button"
              onClick={() => setShowPassword((v) => !v)}
              aria-label={showPassword ? 'Ocultar senha' : 'Mostrar senha'}
              className="absolute right-3 top-1/2 -translate-y-1/2 rounded-lg p-1.5 text-hpe-muted transition-colors hover:text-hpe-white"
            >
              {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          </div>
        </Field>

        {error ? (
          <p
            role="alert"
            className="rounded-xl border border-red-500/25 bg-red-500/[0.07] px-4 py-3 text-sm text-red-300"
          >
            {error}
          </p>
        ) : null}

        <SubmitButton pending={pending} pendingLabel="Entrando…" className="w-full">
          <LogIn className="h-4 w-4" />
          Entrar
        </SubmitButton>
      </form>

      <div className="mt-6 flex flex-col gap-3 border-t border-white/[0.07] pt-6 text-sm">
        <Link
          href="/recuperar-senha"
          className="text-hpe-muted transition-colors hover:text-hpe-white"
        >
          Esqueci minha senha
        </Link>
        <p className="text-xs leading-relaxed text-white/35">
          As contas de aluno são criadas pelo Patrick a partir do seu cadastro. Se
          você ainda não tem acesso, fale com ele pelo WhatsApp.
        </p>
      </div>
    </div>
  );
}
