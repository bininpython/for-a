import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { DEFAULT_LOGO } from '@/components/brand/HpeLogo';

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="hpe-noise relative flex min-h-dvh flex-col items-center justify-center overflow-hidden px-5 py-16">
      <div className="absolute inset-0 bg-hpe-radial" aria-hidden />
      <div className="hpe-grid-bg absolute inset-0" aria-hidden />

      <Link
        href="/"
        className="absolute left-5 top-6 inline-flex items-center gap-2 text-sm text-hpe-muted transition-colors hover:text-hpe-white lg:left-8"
      >
        <ArrowLeft className="h-4 w-4" />
        Voltar ao site
      </Link>

      <div className="relative z-10 w-full max-w-md">
        <div className="mb-9 flex flex-col items-center text-center">
          <img
            src={DEFAULT_LOGO}
            alt="HPE — Força Bruta"
            className="h-14 w-auto object-contain drop-shadow-[0_0_28px_rgba(255,101,0,0.3)]"
          />
          <p className="mt-4 text-[10px] font-semibold uppercase tracking-[0.25em] text-hpe-muted">
            Patrick Personal
          </p>
        </div>

        {children}
      </div>
    </div>
  );
}
