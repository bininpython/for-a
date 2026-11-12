import Link from 'next/link';
import { redirect } from 'next/navigation';
import { LinkIcon, LogOut } from 'lucide-react';
import { getSession } from '@/lib/auth';
import { createClient } from '@/lib/supabase/server';
import { whatsappLink } from '@/lib/utils';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Conta sem vínculo' };

/**
 * A conta existe, mas ainda não está ligada a um cadastro de aluno.
 * Acontece quando a pessoa se cadastra com um e-mail diferente do que o
 * personal registrou. Em vez de mostrar uma área vazia, explicamos o motivo.
 */
export default async function UnlinkedPage() {
  const session = await getSession();
  if (!session) redirect('/entrar');
  if (session.profile.role === 'admin') redirect('/admin');

  const supabase = createClient();

  const { data: student } = await supabase
    .from('students')
    .select('id')
    .eq('profile_id', session.userId)
    .maybeSingle();

  if (student) redirect('/aluno');

  const { data: settings } = await supabase
    .from('personal_settings')
    .select('whatsapp, professional_name')
    .limit(1)
    .maybeSingle();

  const wa = whatsappLink(
    settings?.whatsapp,
    `Olá! Criei minha conta na plataforma HPE com o e-mail ${session.email ?? ''}, mas ela ainda não está vinculada ao meu cadastro.`,
  );

  return (
    <div className="hpe-card p-7 text-center sm:p-8">
      <div>
        <span className="mx-auto inline-flex h-12 w-12 items-center justify-center rounded-xl border border-hpe-orange/30 bg-hpe-orange/10">
          <LinkIcon className="h-5 w-5 text-hpe-orange" />
        </span>

        <h1 className="hpe-display mt-5 text-xl">Conta ainda não vinculada</h1>

        <p className="mt-4 text-sm leading-relaxed text-hpe-muted">
          Sua conta foi criada com o e-mail{' '}
          <strong className="text-hpe-white">{session.email}</strong>, mas ele ainda
          não corresponde a nenhum cadastro de aluno. Fale com{' '}
          {settings?.professional_name ?? 'o personal'} para que ele registre este
          e-mail no seu cadastro — o vínculo é feito automaticamente depois disso.
        </p>

        <div className="mt-8 flex flex-col gap-3">
          {wa ? (
            <a
              href={wa}
              target="_blank"
              rel="noopener noreferrer"
              className="hpe-btn-primary w-full"
            >
              Falar no WhatsApp
            </a>
          ) : null}
          <Link href="/" className="hpe-btn-ghost w-full">
            Voltar ao site
          </Link>
          <form action="/auth/signout" method="post">
            <button type="submit" className="hpe-btn-subtle w-full">
              <LogOut className="h-4 w-4" />
              Sair da conta
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
