/**
 * Leitura das variáveis de ambiente do Supabase.
 *
 * A aplicação não finge estar configurada: se as chaves estiverem ausentes,
 * `supabaseConfigured` é falso e as telas exibem uma instrução clara de
 * configuração em vez de dados inventados.
 */

export const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL ?? '';
export const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? '';

export const supabaseConfigured = Boolean(SUPABASE_URL && SUPABASE_ANON_KEY);

export function requireSupabaseEnv(): { url: string; anonKey: string } {
  if (!supabaseConfigured) {
    throw new Error(
      'Supabase não configurado. Defina NEXT_PUBLIC_SUPABASE_URL e ' +
        'NEXT_PUBLIC_SUPABASE_ANON_KEY (veja .env.example e o README).',
    );
  }
  return { url: SUPABASE_URL, anonKey: SUPABASE_ANON_KEY };
}

export const TIMEZONE = 'America/Sao_Paulo';
