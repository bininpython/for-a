import { Quote } from 'lucide-react';
import { Reveal } from '@/components/ui/Reveal';
import { Avatar } from '@/components/ui/Avatar';
import type { Testimonial } from '@/lib/supabase/database.types';

/**
 * Só aparecem depoimentos com `published = true` e consentimento registrado
 * (`consent_at`) — a própria constraint do banco impede publicar sem
 * autorização. Sem depoimentos autorizados, a seção não é renderizada.
 */
export function TestimonialsSection({ testimonials }: { testimonials: Testimonial[] }) {
  if (testimonials.length === 0) return null;

  return (
    <section
      id="depoimentos"
      className="relative scroll-mt-24 border-t border-white/[0.06] py-24"
    >
      <div className="mx-auto max-w-7xl px-5 lg:px-8">
        <Reveal className="max-w-2xl">
          <p className="hpe-eyebrow">Depoimentos</p>
          <h2 className="hpe-section-title mt-4">Quem treina, conta</h2>
        </Reveal>

        <div className="mt-14 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {testimonials.map((item, index) => (
            <Reveal key={item.id} delay={index * 0.06}>
              <figure className="hpe-card hpe-card-hover flex h-full flex-col p-6">
                <Quote className="h-6 w-6 text-hpe-orange/40" />
                <blockquote className="mt-4 flex-1 text-pretty leading-relaxed text-hpe-white/90">
                  {item.content}
                </blockquote>
                <figcaption className="mt-6 flex items-center gap-3 border-t border-white/[0.07] pt-5">
                  <Avatar name={item.author_name} size={38} />
                  <div>
                    <p className="text-sm font-semibold">{item.author_name}</p>
                    {item.author_role ? (
                      <p className="text-xs text-hpe-muted">{item.author_role}</p>
                    ) : null}
                  </div>
                </figcaption>
              </figure>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}
