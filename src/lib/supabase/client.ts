'use client';

import { createBrowserClient } from '@supabase/ssr';
import type { Database } from './database.types';
import { requireSupabaseEnv } from './env';

let cached: ReturnType<typeof createBrowserClient<Database>> | null = null;

/** Cliente Supabase do navegador (sessão em cookies, compartilhada com o SSR). */
export function createClient() {
  if (cached) return cached;
  const { url, anonKey } = requireSupabaseEnv();
  cached = createBrowserClient<Database>(url, anonKey);
  return cached;
}
