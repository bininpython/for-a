'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { Clock, Plus, Save, Trash2 } from 'lucide-react';
import { Field } from '@/components/ui/Field';
import { useToast } from '@/components/ui/Toast';
import {
  addAvailability,
  removeAvailability,
  toggleAvailability,
  updateBookingRules,
} from './actions';
import type { Availability, PersonalSettings } from '@/lib/supabase/database.types';
import { WEEKDAYS, cn } from '@/lib/utils';

export function SettingsClient({
  availability,
  settings,
}: {
  availability: Availability[];
  settings: PersonalSettings | null;
}) {
  const router = useRouter();
  const toast = useToast();
  const [isPending, startTransition] = useTransition();

  const [weekday, setWeekday] = useState('1');
  const [startTime, setStartTime] = useState('06:00');
  const [endTime, setEndTime] = useState('11:00');

  const [duration, setDuration] = useState(String(settings?.default_session_minutes ?? 60));
  const [buffer, setBuffer] = useState(String(settings?.buffer_minutes ?? 0));
  const [minHours, setMinHours] = useState(String(settings?.min_hours_to_cancel ?? 12));
  const [horizon, setHorizon] = useState(String(settings?.booking_horizon_days ?? 30));

  function run(fn: () => Promise<{ ok: boolean; message?: string }>, success: string) {
    startTransition(async () => {
      const result = await fn();
      if (result.ok) {
        toast.success(success);
        router.refresh();
      } else {
        toast.error(result.message ?? 'Não foi possível concluir a ação.');
      }
    });
  }

  const byWeekday = new Map<number, Availability[]>();
  for (const window of availability) {
    const list = byWeekday.get(window.weekday) ?? [];
    list.push(window);
    byWeekday.set(window.weekday, list);
  }

  return (
    <div className="grid gap-6 xl:grid-cols-2">
      {/* ─── Disponibilidade ─────────────────────────────────────────────── */}
      <section className="hpe-card p-5 sm:p-6">
        <h2 className="hpe-display text-base">Disponibilidade semanal</h2>
        <p className="mt-1 text-sm text-hpe-muted">
          As janelas abaixo definem os horários que os alunos podem agendar.
          Bloqueios e atendimentos já marcados são descontados automaticamente.
        </p>

        <div className="mt-5 space-y-4">
          {[1, 2, 3, 4, 5, 6, 0].map((day) => {
            const windows = (byWeekday.get(day) ?? []).sort((a, b) =>
              a.start_time.localeCompare(b.start_time),
            );
            return (
              <div key={day} className="border-b border-white/[0.05] pb-4 last:border-0">
                <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-hpe-muted">
                  {WEEKDAYS[day]}
                </p>
                {windows.length === 0 ? (
                  <p className="text-sm text-white/25">Sem atendimento</p>
                ) : (
                  <ul className="flex flex-wrap gap-2">
                    {windows.map((window) => (
                      <li
                        key={window.id}
                        className={cn(
                          'inline-flex items-center gap-2 rounded-xl border px-3 py-1.5 text-sm tabular-nums',
                          window.active
                            ? 'border-white/10 bg-white/[0.02]'
                            : 'border-white/5 text-white/30 line-through',
                        )}
                      >
                        {window.start_time.slice(0, 5)}–{window.end_time.slice(0, 5)}
                        <button
                          type="button"
                          disabled={isPending}
                          onClick={() =>
                            run(
                              () => toggleAvailability(window.id, !window.active),
                              window.active ? 'Janela desativada.' : 'Janela ativada.',
                            )
                          }
                          title={window.active ? 'Desativar' : 'Ativar'}
                          className="text-hpe-muted transition-colors hover:text-hpe-white"
                        >
                          <Clock className="h-3.5 w-3.5" />
                        </button>
                        <button
                          type="button"
                          disabled={isPending}
                          onClick={() =>
                            run(() => removeAvailability(window.id), 'Janela removida.')
                          }
                          title="Remover"
                          className="text-hpe-muted transition-colors hover:text-red-300"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            );
          })}
        </div>

        <div className="mt-6 grid gap-3 border-t border-white/[0.07] pt-5 sm:grid-cols-[1fr_auto_auto_auto] sm:items-end">
          <Field label="Dia" htmlFor="av-weekday">
            <select
              id="av-weekday"
              value={weekday}
              onChange={(e) => setWeekday(e.target.value)}
              className="hpe-select"
            >
              {[1, 2, 3, 4, 5, 6, 0].map((day) => (
                <option key={day} value={day}>
                  {WEEKDAYS[day]}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Início" htmlFor="av-start">
            <input
              id="av-start"
              type="time"
              value={startTime}
              onChange={(e) => setStartTime(e.target.value)}
              className="hpe-input"
            />
          </Field>
          <Field label="Fim" htmlFor="av-end">
            <input
              id="av-end"
              type="time"
              value={endTime}
              onChange={(e) => setEndTime(e.target.value)}
              className="hpe-input"
            />
          </Field>
          <button
            type="button"
            disabled={isPending}
            onClick={() =>
              run(
                () =>
                  addAvailability({
                    weekday: Number(weekday),
                    startTime,
                    endTime,
                  }),
                'Janela adicionada.',
              )
            }
            className="hpe-btn-primary hpe-btn-sm h-[46px]"
          >
            <Plus className="h-4 w-4" />
            Adicionar
          </button>
        </div>
      </section>

      {/* ─── Regras de agendamento ───────────────────────────────────────── */}
      <section className="hpe-card h-fit p-5 sm:p-6">
        <h2 className="hpe-display text-base">Regras de agendamento</h2>
        <p className="mt-1 text-sm text-hpe-muted">
          Valem para os agendamentos feitos pelos alunos. Você continua podendo
          encaixar atendimentos manualmente.
        </p>

        <div className="mt-5 grid gap-5 sm:grid-cols-2">
          <Field
            label="Duração padrão (min)"
            htmlFor="rule-duration"
            hint="Usada quando o serviço não define a própria duração."
          >
            <input
              id="rule-duration"
              type="number"
              min={15}
              max={240}
              step={5}
              value={duration}
              onChange={(e) => setDuration(e.target.value)}
              className="hpe-input"
            />
          </Field>

          <Field
            label="Intervalo entre atendimentos (min)"
            htmlFor="rule-buffer"
            hint="Folga reservada após cada sessão."
          >
            <input
              id="rule-buffer"
              type="number"
              min={0}
              max={120}
              step={5}
              value={buffer}
              onChange={(e) => setBuffer(e.target.value)}
              className="hpe-input"
            />
          </Field>

          <Field
            label="Antecedência mínima p/ cancelar (h)"
            htmlFor="rule-cancel"
            hint="Abaixo disso o aluno precisa falar com você."
          >
            <input
              id="rule-cancel"
              type="number"
              min={0}
              max={168}
              value={minHours}
              onChange={(e) => setMinHours(e.target.value)}
              className="hpe-input"
            />
          </Field>

          <Field
            label="Horizonte de agendamento (dias)"
            htmlFor="rule-horizon"
            hint="Até quantos dias à frente o aluno pode marcar."
          >
            <input
              id="rule-horizon"
              type="number"
              min={1}
              max={180}
              value={horizon}
              onChange={(e) => setHorizon(e.target.value)}
              className="hpe-input"
            />
          </Field>
        </div>

        <button
          type="button"
          disabled={isPending}
          onClick={() =>
            run(
              () =>
                updateBookingRules({
                  defaultSessionMinutes: duration,
                  bufferMinutes: buffer,
                  minHoursToCancel: minHours,
                  bookingHorizonDays: horizon,
                }),
              'Regras atualizadas.',
            )
          }
          className="hpe-btn-primary mt-6"
        >
          <Save className="h-4 w-4" />
          Salvar regras
        </button>
      </section>
    </div>
  );
}
