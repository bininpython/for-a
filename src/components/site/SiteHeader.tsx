'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Menu, X } from 'lucide-react';
import { HpeLogo } from '@/components/brand/HpeLogo';
import { cn } from '@/lib/utils';

const LINKS = [
  { href: '/#sobre', label: 'O Personal' },
  { href: '/#servicos', label: 'Serviços' },
  { href: '/#horarios', label: 'Horários' },
  { href: '/#local', label: 'Local' },
  { href: '/#depoimentos', label: 'Depoimentos' },
];

export function SiteHeader({ logoUrl }: { logoUrl?: string | null }) {
  const [scrolled, setScrolled] = useState(false);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 24);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  useEffect(() => {
    document.body.style.overflow = open ? 'hidden' : '';
    return () => {
      document.body.style.overflow = '';
    };
  }, [open]);

  return (
    <header
      className={cn(
        'fixed inset-x-0 top-0 z-50 transition-all duration-500 ease-hpe',
        scrolled
          ? 'border-b border-white/[0.07] bg-hpe-black/85 backdrop-blur-xl'
          : 'border-b border-transparent',
      )}
    >
      <div className="mx-auto flex max-w-7xl items-center justify-between px-5 py-4 lg:px-8">
        <Link href="/" aria-label="HPE — Patrick Personal" onClick={() => setOpen(false)}>
          <HpeLogo logoUrl={logoUrl} />
        </Link>

        <nav className="hidden items-center gap-8 lg:flex">
          {LINKS.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="text-sm font-medium text-hpe-muted transition-colors hover:text-hpe-white"
            >
              {link.label}
            </Link>
          ))}
        </nav>

        <div className="hidden items-center gap-3 lg:flex">
          <Link href="/entrar" className="hpe-btn-subtle hpe-btn-sm">
            Entrar
          </Link>
          <Link href="/agendar" className="hpe-btn-primary hpe-btn-sm">
            Agendar treino
          </Link>
        </div>

        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          aria-label={open ? 'Fechar menu' : 'Abrir menu'}
          aria-expanded={open}
          className="rounded-lg p-2 text-hpe-white transition-colors hover:bg-white/5 lg:hidden"
        >
          {open ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
        </button>
      </div>

      {/* Menu mobile */}
      <div
        className={cn(
          'overflow-hidden border-t border-white/[0.07] bg-hpe-black/98 backdrop-blur-xl',
          'transition-[max-height,opacity] duration-400 ease-hpe lg:hidden',
          open ? 'max-h-[80dvh] opacity-100' : 'max-h-0 opacity-0',
        )}
      >
        <nav className="flex flex-col gap-1 px-5 py-4">
          {LINKS.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              onClick={() => setOpen(false)}
              className="rounded-xl px-4 py-3.5 text-base font-medium text-hpe-muted transition-colors hover:bg-white/[0.04] hover:text-hpe-white"
            >
              {link.label}
            </Link>
          ))}
          <div className="mt-3 flex flex-col gap-2.5 border-t border-white/[0.07] pt-4">
            <Link
              href="/entrar"
              onClick={() => setOpen(false)}
              className="hpe-btn-ghost w-full"
            >
              Entrar
            </Link>
            <Link
              href="/agendar"
              onClick={() => setOpen(false)}
              className="hpe-btn-primary w-full"
            >
              Agendar meu treino
            </Link>
          </div>
        </nav>
      </div>
    </header>
  );
}
