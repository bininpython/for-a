import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import type { Profile, Student } from '@/lib/supabase/database.types';

export interface Session {
  userId: string;
  email: string | null;
  profile: Profile;
}

/** Sessão atual, ou null se não autenticado. */
export async function getSession(): Promise<Session | null> {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .maybeSingle();

  if (!profile) return null;

  return { userId: user.id, email: user.email ?? null, profile };
}

/** Exige sessão de administrador (o personal). */
export async function requireAdmin(): Promise<Session> {
  const session = await getSession();
  if (!session) redirect('/entrar?next=/admin');
  if (session.profile.role !== 'admin') redirect('/aluno');
  return session;
}

/** Exige sessão de aluno com cadastro vinculado. */
export async function requireStudent(): Promise<Session & { student: Student }> {
  const session = await getSession();
  if (!session) redirect('/entrar?next=/aluno');
  if (session.profile.role === 'admin') redirect('/admin');

  const supabase = createClient();
  const { data: student } = await supabase
    .from('students')
    .select('*')
    .eq('profile_id', session.userId)
    .maybeSingle();

  if (!student) redirect('/sem-vinculo');

  return { ...session, student };
}

/** Destino após o login, conforme o perfil. */
export function homeForRole(role: Profile['role']): string {
  return role === 'admin' ? '/admin' : '/aluno';
}
