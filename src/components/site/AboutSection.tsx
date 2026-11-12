import { Award, BadgeCheck, Compass, Dumbbell, Quote, Target } from 'lucide-react';
import { Reveal } from '@/components/ui/Reveal';
import type { PersonalSettings } from '@/lib/supabase/database.types';

/**
 * Apresentação do personal. Todo o conteúdo vem de `personal_settings`,
 * preenchido por Patrick em /admin/perfil. Nada é inventado: blocos sem
 * conteúdo não aparecem, e enquanto o cadastro estiver vazio a seção
 * mostra apenas a estrutura com um aviso visível só para o administrador.
 */
export function AboutSection({ settings }: { settings: PersonalSettings | null }) {
  const name = settings?.professional_name ?? 'Patrick Personal';
  const blocks = [
    { icon: Compass, title: 'Metodologia', body: settings?.methodology },
    { icon: Dumbbell, title: 'Experiência', body: settings?.experience },
    { icon: Quote, title: 'Filosofia de trabalho', body: settings?.philosophy },
  ].filter((block) => Boolean(block.body?.trim()));

  const hasAnyContent =
    Boolean(settings?.bio?.trim()) ||
    blocks.length > 0 ||
    (settings?.specialties?.length ?? 0) > 0 ||
    (settings?.certifications?.length ?? 0) > 0 ||
    (settings?.differentials?.length ?? 0) > 0;

  return (
    <section id="sobre" className="relative scroll-mt-24 border-t border-white/[0.06] py-24">
      <div className="mx-auto max-w-7xl px-5 lg:px-8">
        <div className="grid gap-14 lg:grid-cols-[minmax(0,420px)_1fr] lg:gap-20">
          {/* Fotografia */}
          <Reveal>
            <div className="relative">
              <div className="relative aspect-[4/5] overflow-hidden rounded-3xl border border-white/[0.08] bg-hpe-black-2">
                {settings?.photo_url ? (
                  <img
                    src={settings.photo_url}
                    alt={name}
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <div className="flex h-full flex-col items-center justify-center gap-3 p-8 text-center">
                    <Dumbbell className="h-10 w-10 text-white/15" />
                    <p className="text-sm text-hpe-muted">
                      Espaço reservado para a fotografia profissional
                    </p>
                    <p className="text-xs text-white/30">
                      Envie a imagem em Painel → Meu perfil
                    </p>
                  </div>
                )}
                <div
                  className="absolute inset-x-0 bottom-0 h-1/3 bg-gradient-to-t from-hpe-black via-hpe-black/40 to-transparent"
                  aria-hidden
                />
              </div>
              {/* Moldura laranja deslocada */}
              <div
                className="absolute -bottom-4 -right-4 -z-10 h-full w-full rounded-3xl border border-hpe-orange/25"
                aria-hidden
              />
            </div>
          </Reveal>

          {/* Texto */}
          <div className="flex flex-col justify-center">
            <Reveal>
              <p className="hpe-eyebrow">O Personal</p>
              <h2 className="hpe-section-title mt-4">{name}</h2>
            </Reveal>

            {settings?.headline?.trim() ? (
              <Reveal delay={0.05}>
                <p className="mt-5 text-lg font-medium leading-relaxed text-hpe-white/90">
                  {settings.headline}
                </p>
              </Reveal>
            ) : null}

            {settings?.bio?.trim() ? (
              <Reveal delay={0.1}>
                <div className="mt-5 space-y-4 text-pretty leading-relaxed text-hpe-muted">
                  {settings.bio.split(/\n{2,}/).map((paragraph, i) => (
                    <p key={i}>{paragraph}</p>
                  ))}
                </div>
              </Reveal>
            ) : null}

            {!hasAnyContent ? (
              <Reveal delay={0.1}>
                <div className="mt-6 rounded-2xl border border-dashed border-white/12 p-6">
                  <p className="text-sm leading-relaxed text-hpe-muted">
                    Biografia, metodologia, especialidades e certificações ainda não
                    foram preenchidas. Esses textos são cadastrados pelo próprio
                    Patrick no painel administrativo, em <strong>Meu perfil</strong> —
                    nenhuma informação profissional é gerada automaticamente.
                  </p>
                </div>
              </Reveal>
            ) : null}

            {/* Especialidades */}
            {settings?.specialties?.length ? (
              <Reveal delay={0.15}>
                <div className="mt-8">
                  <h3 className="flex items-center gap-2 text-sm font-semibold uppercase tracking-wider text-hpe-white">
                    <Target className="h-4 w-4 text-hpe-orange" />
                    Especialidades
                  </h3>
                  <ul className="mt-3 flex flex-wrap gap-2">
                    {settings.specialties.map((item) => (
                      <li
                        key={item}
                        className="rounded-full border border-white/10 bg-white/[0.03] px-3.5 py-1.5 text-sm text-hpe-muted"
                      >
                        {item}
                      </li>
                    ))}
                  </ul>
                </div>
              </Reveal>
            ) : null}

            {/* Blocos de texto */}
            {blocks.length ? (
              <div className="mt-10 grid gap-4 sm:grid-cols-2">
                {blocks.map((block, i) => (
                  <Reveal key={block.title} delay={0.1 + i * 0.07}>
                    <div className="hpe-card h-full p-5">
                      <block.icon className="h-5 w-5 text-hpe-orange" />
                      <h3 className="mt-3 font-display text-base font-semibold uppercase tracking-wide">
                        {block.title}
                      </h3>
                      <p className="mt-2 text-sm leading-relaxed text-hpe-muted">
                        {block.body}
                      </p>
                    </div>
                  </Reveal>
                ))}
              </div>
            ) : null}

            {/* Diferenciais + certificações */}
            <div className="mt-10 grid gap-8 sm:grid-cols-2">
              {settings?.differentials?.length ? (
                <Reveal delay={0.1}>
                  <h3 className="flex items-center gap-2 text-sm font-semibold uppercase tracking-wider text-hpe-white">
                    <BadgeCheck className="h-4 w-4 text-hpe-orange" />
                    Diferenciais
                  </h3>
                  <ul className="mt-3 space-y-2.5">
                    {settings.differentials.map((item) => (
                      <li key={item} className="flex gap-2.5 text-sm text-hpe-muted">
                        <span className="mt-[0.45rem] h-1.5 w-1.5 shrink-0 rounded-full bg-hpe-orange" />
                        {item}
                      </li>
                    ))}
                  </ul>
                </Reveal>
              ) : null}

              {settings?.certifications?.length ? (
                <Reveal delay={0.15}>
                  <h3 className="flex items-center gap-2 text-sm font-semibold uppercase tracking-wider text-hpe-white">
                    <Award className="h-4 w-4 text-hpe-orange" />
                    Certificações
                  </h3>
                  <ul className="mt-3 space-y-2.5">
                    {settings.certifications.map((item) => (
                      <li key={item} className="flex gap-2.5 text-sm text-hpe-muted">
                        <span className="mt-[0.45rem] h-1.5 w-1.5 shrink-0 rounded-full bg-hpe-orange" />
                        {item}
                      </li>
                    ))}
                  </ul>
                </Reveal>
              ) : null}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
