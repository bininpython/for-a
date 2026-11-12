import Link from 'next/link';
import { ArrowUpRight, Check, Clock } from 'lucide-react';
import { Reveal } from '@/components/ui/Reveal';
import { EmptyState } from '@/components/ui/EmptyState';
import type { Service } from '@/lib/supabase/database.types';

export function ServicesSection({ services }: { services: Service[] }) {
  return (
    <section
      id="servicos"
      className="relative scroll-mt-24 border-t border-white/[0.06] bg-hpe-black-2/30 py-24"
    >
      <div className="mx-auto max-w-7xl px-5 lg:px-8">
        <Reveal className="max-w-2xl">
          <p className="hpe-eyebrow">Serviços</p>
          <h2 className="hpe-section-title mt-4">
            Treino construído para o seu objetivo
          </h2>
          <p className="mt-5 text-pretty leading-relaxed text-hpe-muted">
            Cada modalidade tem estrutura própria de periodização, volume e
            acompanhamento. Escolha o ponto de partida — o ajuste fino acontece
            na primeira sessão.
          </p>
        </Reveal>

        {services.length === 0 ? (
          <EmptyState
            className="mt-12"
            title="Nenhum serviço cadastrado"
            description="Os serviços são cadastrados no painel administrativo e aparecem aqui automaticamente."
          />
        ) : (
          <div className="mt-14 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {services.map((service, index) => (
              <Reveal key={service.id} delay={index * 0.06}>
                <article className="hpe-card hpe-card-hover group relative flex h-full flex-col p-6">
                  {/* Número de ordem, discreto */}
                  <span
                    className="absolute right-5 top-5 font-display text-4xl font-extrabold leading-none text-white/[0.045] transition-colors duration-500 group-hover:text-hpe-orange/15"
                    aria-hidden
                  >
                    {String(index + 1).padStart(2, '0')}
                  </span>

                  <h3 className="relative pr-12 font-display text-xl font-bold uppercase leading-tight tracking-tight">
                    {service.name}
                  </h3>

                  {service.description ? (
                    <p className="mt-3 flex-1 text-sm leading-relaxed text-hpe-muted">
                      {service.description}
                    </p>
                  ) : (
                    <div className="flex-1" />
                  )}

                  {service.benefits.length ? (
                    <ul className="mt-5 space-y-2">
                      {service.benefits.map((benefit) => (
                        <li key={benefit} className="flex gap-2.5 text-sm text-hpe-muted">
                          <Check className="mt-0.5 h-3.5 w-3.5 shrink-0 text-hpe-orange" />
                          {benefit}
                        </li>
                      ))}
                    </ul>
                  ) : null}

                  <div className="mt-6 flex items-center justify-between gap-3 border-t border-white/[0.07] pt-5">
                    <span className="inline-flex items-center gap-1.5 text-xs text-hpe-muted">
                      <Clock className="h-3.5 w-3.5" />
                      {service.duration_minutes} min
                    </span>
                    {service.bookable ? (
                      <Link
                        href={`/agendar?servico=${service.slug}`}
                        className="inline-flex items-center gap-1.5 text-sm font-semibold uppercase tracking-wider text-hpe-orange transition-colors hover:text-hpe-orange-2"
                      >
                        Agendar
                        <ArrowUpRight className="h-4 w-4 transition-transform duration-300 group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
                      </Link>
                    ) : (
                      <span className="text-xs text-white/30">Sob consulta</span>
                    )}
                  </div>
                </article>
              </Reveal>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
