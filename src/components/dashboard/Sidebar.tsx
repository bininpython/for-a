'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import type { LucideIcon } from 'lucide-react';
import { LogOut, Menu, X } from 'lucide-react';
import { HpeMark } from '@/components/brand/HpeLogo';
import { Avatar } from '@/components/ui/Avatar';
import { cn } from '@/lib/utils';

export interface NavItem {
  href: string;
  label: string;
  icon: LucideIcon;
  badge?: number;
}

export function Sidebar({
  items,
  title,
  userName,
  userPhoto,
  userRole,
}: {
  items: NavItem[];
  title: string;
  userName: string;
  userPhoto?: string | null;
  userRole: string;
}) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  const isActive = (href: string) =>
    pathname === href || (href !== '/admin' && href !== '/aluno' && pathname.startsWith(href));

  const nav = (
    <nav className="flex flex-1 flex-col gap-0.5 overflow-y-auto px-3 py-4">
      {items.map((item) => {
        const active = isActive(item.href);
        return (
          <Link
            key={item.href}
            href={item.href}
            onClick={() => setOpen(false)}
            aria-current={active ? 'page' : undefined}
            className={cn(
              'group relative flex items-center gap-3 rounded-xl px-3.5 py-2.5 text-sm',
              'transition-all duration-200 ease-hpe',
              active
                ? 'bg-hpe-orange/10 font-semibold text-hpe-orange'
                : 'text-hpe-muted hover:bg-white/[0.04] hover:text-hpe-white',
            )}
          >
            {active ? (
              <span className="absolute inset-y-2 left-0 w-0.5 rounded-full bg-hpe-orange" />
            ) : null}
            <item.icon className="h-4 w-4 shrink-0" />
            <span className="flex-1 truncate">{item.label}</span>
            {item.badge ? (
              <span className="inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-hpe-orange px-1.5 text-[11px] font-bold text-hpe-black">
                {item.badge > 99 ? '99+' : item.badge}
              </span>
            ) : null}
          </Link>
        );
      })}
    </nav>
  );

  const footer = (
    <div className="border-t border-white/[0.07] p-3">
      <div className="flex items-center gap-3 rounded-xl px-2 py-2">
        <Avatar name={userName} src={userPhoto} size={36} />
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-medium">{userName}</p>
          <p className="truncate text-[11px] uppercase tracking-wider text-hpe-muted">
            {userRole}
          </p>
        </div>
      </div>
      <form action="/auth/signout" method="post">
        <button
          type="submit"
          className="mt-1 flex w-full items-center gap-3 rounded-xl px-3.5 py-2.5 text-sm text-hpe-muted transition-colors hover:bg-white/[0.04] hover:text-red-300"
        >
          <LogOut className="h-4 w-4" />
          Sair
        </button>
      </form>
    </div>
  );

  return (
    <>
      {/* Barra superior mobile */}
      <header className="sticky top-0 z-40 flex items-center justify-between gap-3 border-b border-white/[0.07] bg-hpe-black/90 px-4 py-3 backdrop-blur-xl lg:hidden">
        <Link href={items[0]?.href ?? '/'} className="flex items-center gap-2.5">
          <HpeMark className="h-8 w-8" />
          <span className="font-display text-sm font-bold uppercase tracking-wider">
            {title}
          </span>
        </Link>
        <button
          type="button"
          onClick={() => setOpen(true)}
          aria-label="Abrir menu"
          className="rounded-lg p-2 text-hpe-white transition-colors hover:bg-white/5"
        >
          <Menu className="h-5 w-5" />
        </button>
      </header>

      {/* Gaveta mobile */}
      {open ? (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div
            className="absolute inset-0 bg-black/70 backdrop-blur-sm"
            onClick={() => setOpen(false)}
          />
          <aside className="absolute inset-y-0 left-0 flex w-[17rem] flex-col border-r border-white/[0.07] bg-hpe-black-2">
            <div className="flex items-center justify-between border-b border-white/[0.07] px-4 py-4">
              <span className="flex items-center gap-2.5">
                <HpeMark className="h-8 w-8" />
                <span className="font-display text-sm font-bold uppercase tracking-wider">
                  {title}
                </span>
              </span>
              <button
                type="button"
                onClick={() => setOpen(false)}
                aria-label="Fechar menu"
                className="rounded-lg p-2 text-hpe-muted transition-colors hover:bg-white/5 hover:text-hpe-white"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            {nav}
            {footer}
          </aside>
        </div>
      ) : null}

      {/* Barra lateral fixa */}
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-[17rem] flex-col border-r border-white/[0.07] bg-hpe-black-2/60 backdrop-blur-xl lg:flex">
        <Link
          href={items[0]?.href ?? '/'}
          className="flex items-center gap-3 border-b border-white/[0.07] px-5 py-5"
        >
          <HpeMark className="h-9 w-9" />
          <span className="flex flex-col leading-tight">
            <span className="font-display text-sm font-bold uppercase tracking-[0.15em]">
              HPE
            </span>
            <span className="text-[10px] uppercase tracking-[0.18em] text-hpe-muted">
              {title}
            </span>
          </span>
        </Link>
        {nav}
        {footer}
      </aside>
    </>
  );
}
