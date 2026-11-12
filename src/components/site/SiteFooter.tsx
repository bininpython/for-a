import Link from 'next/link';
import { Instagram, Mail, MapPin, MessageCircle } from 'lucide-react';
import { HpeLogo } from '@/components/brand/HpeLogo';
import type { PersonalSettings } from '@/lib/supabase/database.types';
import { whatsappLink } from '@/lib/utils';

export function SiteFooter({ settings }: { settings: PersonalSettings | null }) {
  const name = settings?.professional_name ?? 'Patrick Personal';
  const gym = settings?.gym_name ?? 'ALP FIT';
  const city = settings?.gym_city ?? 'Coronel Fabriciano/MG';
  const wa = whatsappLink(settings?.whatsapp);
  const instagram = settings?.instagram?.replace(/^@/, '');

  return (
    <footer className="border-t border-white/[0.07] bg-hpe-black">
      <div className="mx-auto max-w-7xl px-5 py-14 lg:px-8">
        <div className="grid gap-10 sm:grid-cols-2 lg:grid-cols-4">
          <div className="lg:col-span-2">
            <HpeLogo logoUrl={settings?.logo_url} />
            <p className="mt-5 max-w-sm text-sm leading-relaxed text-hpe-muted">
              Treinamento personalizado, acompanhamento profissional e evolução
              constante.
            </p>
            <p className="mt-5 flex items-start gap-2 text-sm text-hpe-muted">
              <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-hpe-orange" />
              <span>
                {gym} · {city}
                {settings?.gym_address ? (
                  <>
                    <br />
                    {settings.gym_address}
                  </>
                ) : null}
              </span>
            </p>
          </div>

          <nav aria-label="Navegação">
            <h3 className="text-xs font-semibold uppercase tracking-[0.18em] text-hpe-white">
              Navegação
            </h3>
            <ul className="mt-4 space-y-2.5 text-sm">
              {[
                { href: '/#sobre', label: 'O Personal' },
                { href: '/#servicos', label: 'Serviços' },
                { href: '/#horarios', label: 'Horários' },
                { href: '/#local', label: 'Local' },
                { href: '/agendar', label: 'Agendar treino' },
                { href: '/entrar', label: 'Área do aluno' },
              ].map((link) => (
                <li key={link.href}>
                  <Link
                    href={link.href}
                    className="text-hpe-muted transition-colors hover:text-hpe-white"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>

          <div>
            <h3 className="text-xs font-semibold uppercase tracking-[0.18em] text-hpe-white">
              Contato
            </h3>
            <ul className="mt-4 space-y-2.5 text-sm">
              {wa ? (
                <li>
                  <a
                    href={wa}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 text-hpe-muted transition-colors hover:text-hpe-white"
                  >
                    <MessageCircle className="h-4 w-4" />
                    WhatsApp
                  </a>
                </li>
              ) : null}
              {instagram ? (
                <li>
                  <a
                    href={`https://instagram.com/${instagram}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 text-hpe-muted transition-colors hover:text-hpe-white"
                  >
                    <Instagram className="h-4 w-4" />@{instagram}
                  </a>
                </li>
              ) : null}
              {settings?.public_email ? (
                <li>
                  <a
                    href={`mailto:${settings.public_email}`}
                    className="inline-flex items-center gap-2 text-hpe-muted transition-colors hover:text-hpe-white"
                  >
                    <Mail className="h-4 w-4" />
                    {settings.public_email}
                  </a>
                </li>
              ) : null}
              {!wa && !instagram && !settings?.public_email ? (
                <li className="text-xs text-white/30">
                  Contatos a cadastrar no painel administrativo.
                </li>
              ) : null}
            </ul>
          </div>
        </div>

        <div className="hpe-divider my-10" />

        <div className="flex flex-col gap-4 text-xs text-hpe-muted sm:flex-row sm:items-center sm:justify-between">
          <p>
            © {new Date().getFullYear()} HPE — {name}. Todos os direitos reservados.
          </p>
          <nav className="flex gap-6">
            <Link href="/privacidade" className="transition-colors hover:text-hpe-white">
              Política de privacidade
            </Link>
            <Link href="/termos" className="transition-colors hover:text-hpe-white">
              Termos de uso
            </Link>
          </nav>
        </div>
      </div>
    </footer>
  );
}
