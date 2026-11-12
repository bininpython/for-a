import Link from 'next/link';
import { ArrowRight, CalendarDays, Clock } from 'lucide-react';
import { Reveal } from '@/components/ui/Reveal';
import { createClient } from '@/lib/supabase/server';
import { supabaseConfigured } from '@/lib/supabase/env';
import type { Availability } from '@/lib/supabase/database.types';
import { WEEKDAYS, addDaysISO, formatDate, formatTime, todayISO } from '@/lib/utils';

interface DaySlots {
  date: string;
  slots: string[];
}

/**
 * Horários livres reais, calculados pela função `available_slots` do banco
 * (janelas semanais − bloqueios − atendimentos já ocupados).
 */
async function loadNextSlots(days = 5): Promise<DaySlots[]> {
  if (!supabaseConfigured) return [];
  const supabase = createClient();
  const today = todayISO();

  const results = await Promise.all(
    Array.from({ length: days }, (_, i) => addDaysISO(today, i)).map(async (date) => {
      const { data } = await supabase.rpc('available_slots', { p_date: date });
      return {
        date,
        slots: (data ?? []).map((slot) => slot.slot_start).slice(0, 8),
      };
    }),
  );

  return results.filter((day) => day.slots.length > 0);
}

function WeeklyGrid({ availability }: { availability: Availability[] }) {
  const byWeekday = new Map<number, Availability[]>();
  for (const window of availability) {
    const list = byWeekday.get(window.weekday) ?? [];
    list.push(window);
    byWeekday.set(window.weekday, list);
  }

  return (
    <div className="hpe-card divide-y divide-white/[0.05] overflow-hidden">
      {[1, 2, 3, 4, 5, 6, 0].map((weekday) => {
        const windows = (byWeekday.get(weekday) ?? []).sort((a, b) =>
          a.start_time.localeCompare(b.start_time),
        );
        return (
          <div
            key={weekday}
            className="flex items-center justify-between gap-4 px-5 py-3.5"
          >
            <span className="text-sm font-medium text-hpe-white">{WEEKDAYS[weekday]}</span>
            {windows.length === 0 ? (
              <span className="text-sm text-white/25">Sem atendimento</span>
            ) : (
              <span className="text-right text-sm text-hpe-muted">
                {windows
                  .map((w) => `${w.start_time.slice(0, 5)}–${w.end_time.slice(0, 5)}`)
                  .join(' · ')}
              </span>
            )}
          </div>
        );
      })}
    </div>
  );
}

export async function AvailabilitySection({
  availability,
}: {
  availability: Availability[];
}) {
  const nextSlots = await loadNextSlots();

  return (
    <section
      id="horarios"
      className="relative scroll-mt-24 border-t border-white/[0.06] bg-hpe-black-2/30 py-24"
    >
      <div className="mx-auto max-w-7xl px-5 lg:px-8">
        <Reveal className="max-w-2xl">
          <p className="hpe-eyebrow">Disponibilidade</p>
          <h2 className="hpe-section-title mt-4">Horários livres agora</h2>
          <p className="mt-5 text-pretty leading-relaxed text-hpe-muted">
            A lista abaixo vem direto da agenda — horários já ocupados, bloqueios e
            folgas não aparecem. Escolha um e siga para o agendamento.
          </p>
        </Reveal>

        <div className="mt-14 grid gap-6 lg:grid-cols-[1fr_minmax(0,380px)] lg:gap-10">
          {/* Próximos horários livres */}
          <Reveal>
            {nextSlots.length === 0 ? (
              <div className="hpe-card flex h-full flex-col items-center justify-center gap-3 p-10 text-center">
                <CalendarDays className="h-8 w-8 text-white/20" />
                <p className="font-display text-base font-semibold uppercase tracking-wide">
                  Nenhum horário livre nos próximos dias
                </p>
                <p className="max-w-sm text-sm text-hpe-muted">
                  A agenda pode abrir novas vagas a qualquer momento. Abra a página de
                  agendamento para ver o calendário completo ou fale direto com o
                  Patrick.
                </p>
                <Link href="/agendar" className="hpe-btn-ghost hpe-btn-sm mt-2">
                  Ver calendário
                </Link>
              </div>
            ) : (
              <div className="space-y-5">
                {nextSlots.map((day) => (
                  <div key={day.date} className="hpe-card p-5">
                    <div className="flex items-baseline justify-between gap-3">
                      <h3 className="font-display text-base font-bold uppercase tracking-wide">
                        {formatDate(day.date, { weekday: 'long' })}
                      </h3>
                      <span className="text-xs text-hpe-muted">
                        {formatDate(day.date, { day: '2-digit', month: 'short' })}
                      </span>
                    </div>
                    <div className="mt-4 flex flex-wrap gap-2">
                      {day.slots.map((slot) => (
                        <Link
                          key={slot}
                          href={`/agendar?data=${day.date}&hora=${encodeURIComponent(slot)}`}
                          className="inline-flex items-center gap-1.5 rounded-xl border border-white/10 bg-white/[0.02] px-3.5 py-2 text-sm font-medium tabular-nums transition-all duration-300 ease-hpe hover:border-hpe-orange/50 hover:bg-hpe-orange/10 hover:text-hpe-orange-2"
                        >
                          <Clock className="h-3.5 w-3.5 opacity-50" />
                          {formatTime(slot)}
                        </Link>
                      ))}
                    </div>
                  </div>
                ))}
                <Link
                  href="/agendar"
                  className="group inline-flex items-center gap-2 text-sm font-semibold uppercase tracking-wider text-hpe-orange transition-colors hover:text-hpe-orange-2"
                >
                  Ver calendário completo
                  <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
                </Link>
              </div>
            )}
          </Reveal>

          {/* Grade semanal */}
          <Reveal delay={0.1}>
            <h3 className="mb-4 text-xs font-semibold uppercase tracking-[0.18em] text-hpe-muted">
              Grade semanal de atendimento
            </h3>
            <WeeklyGrid availability={availability} />
          </Reveal>
        </div>
      </div>
    </section>
  );
}
