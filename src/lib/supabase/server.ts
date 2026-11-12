import { cookies } from 'next/headers';
import { createServerClient } from '@supabase/ssr';
import type { Database } from './database.types';
import { SUPABASE_ANON_KEY, SUPABASE_URL, supabaseConfigured } from './env';

/**
 * Cliente Supabase para Server Components, Server Actions e rotas de API.
 * Usa a sessão do usuário — portanto todas as consultas passam por RLS.
 */
export function createClient() {
  const cookieStore = cookies();

  return createServerClient<Database>(SUPABASE_URL, SUPABASE_ANON_KEY, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          cookiesToSet.forEach(({ name, value, options }) =>
            cookieStore.set(name, value, options),
          );
        } catch {
          // Server Components não podem escrever cookies; o middleware já
          // renova a sessão antes da renderização.
        }
      },
    },
  });
}

/**
 * Cliente com a chave de serviço. Ignora RLS — usar apenas em Server Actions
 * já protegidas por verificação de permissão (ex.: criar conta de aluno).
 */
export function createAdminClient() {
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseConfigured || !key) {
    throw new Error(
      'SUPABASE_SERVICE_ROLE_KEY não configurada. Necessária para criar ' +
        'contas de acesso dos alunos (veja .env.example).',
    );
  }

  return createServerClient<Database>(SUPABASE_URL, key, {
    cookies: { getAll: () => [], setAll: () => {} },
    auth: { persistSession: false, autoRefreshToken: false },
  });
}
