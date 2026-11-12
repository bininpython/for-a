import { ExternalLink, Info, MapPin, Navigation } from 'lucide-react';
import { Reveal } from '@/components/ui/Reveal';
import type { PersonalSettings } from '@/lib/supabase/database.types';

export function LocationSection({ settings }: { settings: PersonalSettings | null }) {
  const gymName = settings?.gym_name ?? 'ALP FIT';
  const gymCity = settings?.gym_city ?? 'Coronel Fabriciano/MG';
  const address = settings?.gym_address?.trim();

  // Busca pelo endereço cadastrado; sem endereço, pelo nome da academia + cidade.
  const query = encodeURIComponent(address ? `${gymName}, ${address}` : `${gymName}, ${gymCity}`);
  const mapsUrl = settings?.gym_maps_url?.trim() || `https://www.google.com/maps/search/?api=1&query=${query}`;
  const embedUrl = `https://maps.google.com/maps?q=${query}&z=15&output=embed`;

  return (
    <section id="local" className="relative scroll-mt-24 border-t border-white/[0.06] py-24">
      <div className="mx-auto max-w-7xl px-5 lg:px-8">
        <div className="grid gap-12 lg:grid-cols-2 lg:items-center lg:gap-16">
          <Reveal>
            <p className="hpe-eyebrow">Onde treinamos</p>
            <h2 className="hpe-section-title mt-4">{gymName}</h2>
            <p className="mt-3 text-lg text-hpe-muted">{gymCity}</p>

            <dl className="mt-9 space-y-6">
              <div className="flex gap-4">
                <span className="mt-0.5 inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-hpe-orange/25 bg-hpe-orange/[0.07]">
                  <MapPin className="h-4 w-4 text-hpe-orange" />
                </span>
                <div>
                  <dt className="text-xs font-semibold uppercase tracking-wider text-hpe-muted">
                    Endereço
                  </dt>
                  <dd className="mt-1 leading-relaxed text-hpe-white">
                    {address ?? (
                      <span className="text-sm text-hpe-muted">
                        Endereço completo a ser cadastrado no painel administrativo.
                      </span>
                    )}
                  </dd>
                </div>
              </div>

              {settings?.attendance_notes?.trim() ? (
                <div className="flex gap-4">
                  <span className="mt-0.5 inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-white/10 bg-white/[0.03]">
                    <Info className="h-4 w-4 text-hpe-muted" />
                  </span>
                  <div>
                    <dt className="text-xs font-semibold uppercase tracking-wider text-hpe-muted">
                      Informações de atendimento
                    </dt>
                    <dd className="mt-1 leading-relaxed text-hpe-white">
                      {settings.attendance_notes}
                    </dd>
                  </div>
                </div>
              ) : null}
            </dl>

            <a
              href={mapsUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="hpe-btn-ghost mt-9"
            >
              <Navigation className="h-4 w-4" />
              Abrir no Google Maps
              <ExternalLink className="h-3.5 w-3.5 opacity-60" />
            </a>
          </Reveal>

          <Reveal delay={0.1}>
            <div className="relative overflow-hidden rounded-3xl border border-white/[0.08] bg-hpe-black-2">
              <iframe
                title={`Mapa — ${gymName}`}
                src={embedUrl}
                loading="lazy"
                referrerPolicy="no-referrer-when-downgrade"
                className="h-[360px] w-full border-0 opacity-90 grayscale-[0.4] transition-all duration-700 hover:opacity-100 hover:grayscale-0 sm:h-[460px]"
              />
              <div
                className="pointer-events-none absolute inset-0 ring-1 ring-inset ring-white/[0.06]"
                aria-hidden
              />
            </div>
          </Reveal>
        </div>
      </div>
    </section>
  );
}
