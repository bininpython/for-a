import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { LoginForm } from './LoginForm';
import { SetupNotice } from '@/components/ui/SetupNotice';
import { supabaseConfigured } from '@/lib/supabase/env';
import { getSession, homeForRole } from '@/lib/auth';

export const metadata: Metadata = { title: 'Entrar' };

export default async function LoginPage({
  searchParams,
}: {
  searchParams: { next?: string };
}) {
  if (!supabaseConfigured) {
    return <SetupNotice context="O login depende do Supabase Auth." />;
  }

  const session = await getSession();
  if (session) redirect(searchParams.next || homeForRole(session.profile.role));

  return <LoginForm next={searchParams.next} />;
}
