'use client';

import dynamic from 'next/dynamic';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { ArrowRight, MapPin, User } from 'lucide-react';
import { DEFAULT_LOGO } from '@/components/brand/HpeLogo';

// O 3D só carrega no cliente e fora do bundle inicial.
const HeroScene = dynamic(() => import('@/components/three/HeroScene'), {
  ssr: false,
  loading: () => null,
});

const EASE = [0.16, 1, 0.3, 1] as const;

export function Hero({
  professionalName,
  gymName,
  gymCity,
  logoUrl,
}: {
  professionalName: string;
  gymName: string;
  gymCity: string;
  logoUrl?: string | null;
}) {
  return (
    <section className="hpe-noise relative flex min-h-[100svh] items-center overflow-hidden pt-24">
      {/* Camadas de fundo */}
      <div className="absolute inset-0 bg-hpe-radial" aria-hidden />
      <div className="hpe-grid-bg absolute inset-0" aria-hidden />
      <HeroScene />
      {/* Véu que garante contraste do texto sobre o 3D */}
      <div
        className="absolute inset-0 bg-gradient-to-r from-hpe-black via-hpe-black/85 to-transparent lg:via-hpe-black/60"
        aria-hidden
      />
      <div
        className="absolute inset-x-0 bottom-0 h-32 bg-gradient-to-t from-hpe-black to-transparent"
        aria-hidden
      />

      <div className="relative z-10 mx-auto w-full max-w-7xl px-5 py-16 lg:px-8">
        <div className="max-w-2xl">
          <motion.img
            src={logoUrl || DEFAULT_LOGO}
            alt="HPE — Força Bruta"
            initial={{ opacity: 0, y: 10, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            transition={{ duration: 0.9, ease: EASE }}
            className="mb-8 h-16 w-auto object-contain drop-shadow-[0_0_32px_rgba(255,101,0,0.35)] sm:h-20"
          />

          <motion.div
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.05, ease: EASE }}
            className="inline-flex items-center gap-2 rounded-full border border-hpe-orange/25 bg-hpe-orange/[0.07] px-4 py-1.5"
          >
            <MapPin className="h-3.5 w-3.5 text-hpe-orange" />
            <span className="text-[11px] font-semibold uppercase tracking-[0.18em] text-hpe-orange-2">
              {gymName} · {gymCity}
            </span>
          </motion.div>

          <motion.h1
            initial={{ opacity: 0, y: 22 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.08, ease: EASE }}
            className="hpe-display mt-7 text-balance text-[2.6rem] leading-[0.95] sm:text-6xl lg:text-7xl"
          >
            Supere seus limites.
            <br />
            <span className="bg-gradient-to-r from-hpe-orange-2 to-hpe-orange bg-clip-text text-transparent">
              Construa sua melhor versão.
            </span>
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 18 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.18, ease: EASE }}
            className="mt-6 max-w-xl text-pretty text-base leading-relaxed text-hpe-muted sm:text-lg"
          >
            Treinamento personalizado, acompanhamento profissional e evolução constante.
            Sua transformação começa com um treino.
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 18 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.28, ease: EASE }}
            className="mt-9 flex flex-col gap-3 sm:flex-row"
          >
            <Link href="/agendar" className="hpe-btn-primary group">
              Agendar meu treino
              <ArrowRight className="h-4 w-4 transition-transform duration-300 group-hover:translate-x-1" />
            </Link>
            <Link href="#sobre" className="hpe-btn-ghost">
              <User className="h-4 w-4" />
              Conhecer o personal
            </Link>
          </motion.div>

          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 1, delay: 0.5 }}
            className="mt-10 text-xs uppercase tracking-[0.2em] text-white/35"
          >
            {professionalName} · HPE
          </motion.p>
        </div>
      </div>

      {/* Indicador de rolagem */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 1.1 }}
        className="absolute inset-x-0 bottom-7 z-10 flex justify-center"
        aria-hidden
      >
        <div className="h-10 w-5 rounded-full border border-white/15 p-1">
          <motion.div
            animate={{ y: [0, 14, 0] }}
            transition={{ duration: 1.9, repeat: Infinity, ease: 'easeInOut' }}
            className="h-1.5 w-full rounded-full bg-hpe-orange"
          />
        </div>
      </motion.div>
    </section>
  );
}
