import Link from 'next/link';
import { ArrowRight, MessageCircle } from 'lucide-react';
import { Reveal } from '@/components/ui/Reveal';
import { whatsappLink } from '@/lib/utils';

export function CtaSection({ whatsapp }: { whatsapp?: string | null }) {
  const wa = whatsappLink(
    whatsapp,
    'Olá, Patrick! Vim pelo site da HPE e quero agendar um treino.',
  );

  return (
    <section className="relative overflow-hidden border-t border-white/[0.06] py-28">
      <div className="absolute inset-0 bg-hpe-radial" aria-hidden />
      <div
        className="absolute left-1/2 top-0 h-px w-2/3 -translate-x-1/2 bg-gradient-to-r from-transparent via-hpe-orange/50 to-transparent"
        aria-hidden
      />

      <Reveal className="relative mx-auto max-w-4xl px-5 text-center lg:px-8">
        <h2 className="hpe-display text-balance text-4xl leading-[0.95] sm:text-5xl lg:text-6xl">
          Seu próximo nível
          <br />
          <span className="bg-gradient-to-r from-hpe-orange-2 to-hpe-orange bg-clip-text text-transparent">
            começa agora.
          </span>
        </h2>

        <div className="mt-10 flex flex-col items-center justify-center gap-3 sm:flex-row">
          <Link href="/agendar" className="hpe-btn-primary group w-full sm:w-auto">
            Agendar meu treino
            <ArrowRight className="h-4 w-4 transition-transform duration-300 group-hover:translate-x-1" />
          </Link>
          {wa ? (
            <a
              href={wa}
              target="_blank"
              rel="noopener noreferrer"
              className="hpe-btn-ghost w-full sm:w-auto"
            >
              <MessageCircle className="h-4 w-4" />
              Falar no WhatsApp
            </a>
          ) : null}
        </div>
      </Reveal>
    </section>
  );
}
