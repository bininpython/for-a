'use client';

import { useCallback, useEffect, useState, useTransition } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  CalendarCheck,
  CalendarDays,
  Check,
  Clock,
  LogIn,
  MessageCircle,
} from 'lucide-react';
import { Calendar } from '@/components/booking/Calendar';
import { Field } from '@/components/ui/Field';
import { useToast } from '@/components/ui/Toast';
import { bookAppointment, fetchSlots } from './actions';
import type { AvailableSlot, Service } from '@/lib/supabase/database.types';
import {
  addDaysISO,
  cn,
  formatDate,
  formatTime,
  todayISO,
  whatsappLink,
} from '@/lib/utils';

type Step = 1 | 2 | 3;

export function BookingFlow({
  services,
  signedIn,
  isAdmin,
  horizonDays,
  whatsapp,
  initialServiceSlug,
  initialDate,
  initialSlot,
  weekdaysWithoutService,
}: {
  services: Service[];
  signedIn: boolean;
  isAdmin: boolean;
  horizonDays: number;
  whatsapp: string | null;
  initialServiceSlug?: string;
  initialDate?: string;
  initialSlot?: string;
  weekdaysWithoutService: number[];
}) {
  const router = useRouter();
  const toast = useToast();
  const [isPending, startTransition] = useTransition();

  const initialService =
    services.find((s) => s.slug === initialServiceSlug) ?? services[0] ?? null;

  const [service, setService] = useState<Service | null>(initialService);
  const [date, setDate] = useState<string | null>(initialDate ?? null);
  const [slot, setSlot] = useState<string | null>(initialSlot ?? null);
  const [notes, setNotes] = useState('');
  const [slots, setSlots] = useState<AvailableSlot[]>([]);
  const [loadingSlots, setLoadingSlots] = useState(false);
  const [confirmed, setConfirmed] = useState<{ startsAt: string } | null>(null);

  const step: Step = !service ? 1 : !slot ? 2 : 3;

  const loadSlots = useCallback(
    async (targetDate: string, targetService: Service | null) => {
      setLoadingSlots(true);
      setSlots([]);
      const result = await fetchSlots(targetDate, targetService?.id ?? null);
      if (result.ok) {
        setSlots(result.data ?? []);
      } else {
        toast.error(result.message ?? 'Não foi possível consultar a agenda.');
      }
      setLoadingSlots(false);
    },
    [toast],
  );

  useEffect(() => {
    if (date) void loadSlots(date, service);
  }, [date, service, loadSlots]);

  function selectDate(value: string) {
    setDate(value);
    setSlot(null);
  }

  function selectService(value: Service) {
    setService(value);
    setSlot(null);
  }

  function confirm() {
    if (!slot) return;
    startTransition(async () => {
      const result = await bookAppointment({
        serviceId: service?.id ?? null,
        startsAt: slot,
        notes: notes.trim() || null,
      });

      if (!result.ok) {
        toast.error(result.message ?? 'Não foi possível agendar.');
        // O horário pode ter sido ocupado no meio do caminho: recarrega a lista.
        if (date) void loadSlots(date, service);
        setSlot(null);
        return;
      }

      setConfirmed({ startsAt: result.data!.startsAt });
      toast.success('Agendamento registrado.');
      router.refresh();
    });
  }

  // ─── Confirmação ──────────────────────────────────────────────────────────
  if (confirmed) {
    const wa = whatsappLink(
      whatsapp,
      `Olá, Patrick! Agendei um treino para ${formatDate(confirmed.startsAt)} às ${formatTime(confirmed.startsAt)}.`,
    );

    return (
      <div className="hpe-card mx-auto max-w-lg p-8 text-center">
        <span className="mx-auto inline-flex h-14 w-14 items-center justify-center rounded-2xl border border-emerald-500/30 bg-emerald-500/10">
          <CalendarCheck className="h-6 w-6 text-emerald-400" />
        </span>
        <h2 className="hpe-display mt-6 text-2xl">Treino agendado</h2>
        <p className="mt-3 text-sm leading-relaxed text-hpe-muted">
          {formatDate(confirmed.startsAt, {
            weekday: 'long',
            day: '2-digit',
            month: 'long',
          })}{' '}
          às <strong className="text-hpe-white">{formatTime(confirmed.startsAt)}</strong>
          {service ? (
            <>
              <br />
              {service.name}
            </>
          ) : null}
        </p>
        <p className="mt-4 text-xs leading-relaxed text-white/40">
          O pedido fica com status <strong>solicitado</strong> até Patrick confirmar.
          Você acompanha tudo na sua área.
        </p>

        <div className="mt-8 flex flex-col gap-3">
          <Link href="/aluno/agendamentos" className="hpe-btn-primary w-full">
            Ver meus agendamentos
          </Link>
          {wa ? (
            <a
              href={wa}
              target="_blank"
              rel="noopener noreferrer"
              className="hpe-btn-ghost w-full"
            >
              <MessageCircle className="h-4 w-4" />
              Avisar no WhatsApp
            </a>
          ) : null}
        </div>
      </div>
    );
  }

  return (
    <div className="grid gap-8 lg:grid-cols-[1fr_minmax(0,380px)] lg:gap-12">
      <div className="space-y-10">
        {/* ─── 1. Tipo de treinamento ─────────────────────────────────────── */}
        <section>
          <StepHeader index={1} title="Tipo de treinamento" done={Boolean(service)} />
          <div className="mt-5 grid gap-3 sm:grid-cols-2">
            {services.map((item) => {
              const active = service?.id === item.id;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => selectService(item)}
                  className={cn(
                    'rounded-2xl border p-4 text-left transition-all duration-300 ease-hpe',
                    active
                      ? 'border-hpe-orange/60 bg-hpe-orange/[0.07] shadow-glow'
                      : 'border-white/[0.07] bg-hpe-black-2/60 hover:border-white/20',
                  )}
                >
                  <div className="flex items-start justify-between gap-3">
                    <h3 className="font-display text-base font-bold uppercase leading-tight tracking-tight">
                      {item.name}
                    </h3>
                    {active ? (
                      <Check className="mt-0.5 h-4 w-4 shrink-0 text-hpe-orange" />
                    ) : null}
                  </div>
                  <p className="mt-2 inline-flex items-center gap-1.5 text-xs text-hpe-muted">
                    <Clock className="h-3.5 w-3.5" />
                    {item.duration_minutes} min
                  </p>
                </button>
              );
            })}
          </div>
        </section>

        {/* ─── 2. Data e horário ──────────────────────────────────────────── */}
        <section>
          <StepHeader index={2} title="Data e horário" done={Boolean(slot)} />

          <div className="mt-5 grid gap-5 sm:grid-cols-[minmax(0,320px)_1fr]">
            <Calendar
              selected={date}
              onSelect={selectDate}
              minDate={todayISO()}
              maxDate={addDaysISO(todayISO(), horizonDays)}
              disabledWeekdays={weekdaysWithoutService}
            />

            <div className="hpe-card p-5">
              {!date ? (
                <div className="flex h-full min-h-[12rem] flex-col items-center justify-center gap-2 text-center">
                  <CalendarDays className="h-7 w-7 text-white/15" />
                  <p className="text-sm text-hpe-muted">
                    Escolha uma data para ver os horários livres.
                  </p>
                </div>
              ) : loadingSlots ? (
                <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                  {Array.from({ length: 6 }).map((_, i) => (
                    <div key={i} className="hpe-skeleton h-10" />
                  ))}
                </div>
              ) : slots.length === 0 ? (
                <div className="flex h-full min-h-[12rem] flex-col items-center justify-center gap-2 text-center">
                  <p className="font-display text-sm font-semibold uppercase tracking-wide">
                    Sem horários livres
                  </p>
                  <p className="max-w-xs text-sm text-hpe-muted">
                    {formatDate(date, { weekday: 'long', day: '2-digit', month: 'long' })}{' '}
                    está sem vagas. Tente outro dia.
                  </p>
                </div>
              ) : (
                <>
                  <p className="mb-4 text-xs font-semibold uppercase tracking-wider text-hpe-muted">
                    {formatDate(date, { weekday: 'long', day: '2-digit', month: 'long' })}
                  </p>
                  <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                    {slots.map((item) => {
                      const active = slot === item.slot_start;
                      return (
                        <button
                          key={item.slot_start}
                          type="button"
                          onClick={() => setSlot(item.slot_start)}
                          className={cn(
                            'rounded-xl border px-3 py-2.5 text-sm font-medium tabular-nums',
                            'transition-all duration-200 ease-hpe',
                            active
                              ? 'border-hpe-orange bg-hpe-orange text-hpe-black'
                              : 'border-white/10 bg-white/[0.02] hover:border-hpe-orange/50 hover:bg-hpe-orange/10',
                          )}
                        >
                          {formatTime(item.slot_start)}
                        </button>
                      );
                    })}
                  </div>
                </>
              )}
            </div>
          </div>
        </section>

        {/* ─── 3. Confirmação ─────────────────────────────────────────────── */}
        <section>
          <StepHeader index={3} title="Confirmação" done={false} />
          <div className="mt-5">
            <Field
              label="Observação para o personal"
              htmlFor="notes"
              hint="Opcional — lesões, restrições, foco do treino."
            >
              <textarea
                id="notes"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                maxLength={500}
                rows={3}
                className="hpe-textarea"
                placeholder="Ex.: estou voltando de uma lesão no ombro direito."
              />
            </Field>
          </div>
        </section>
      </div>

      {/* ─── Resumo ───────────────────────────────────────────────────────── */}
      <aside className="lg:sticky lg:top-28 lg:self-start">
        <div className="hpe-card p-6">
          <h2 className="hpe-display text-lg">Resumo</h2>

          <dl className="mt-5 space-y-4 text-sm">
            <Summary label="Treinamento" value={service?.name ?? '—'} />
            <Summary
              label="Data"
              value={
                date
                  ? formatDate(date, { weekday: 'long', day: '2-digit', month: 'long' })
                  : '—'
              }
            />
            <Summary label="Horário" value={slot ? formatTime(slot) : '—'} />
            <Summary
              label="Duração"
              value={service ? `${service.duration_minutes} min` : '—'}
            />
          </dl>

          <div className="mt-7">
            {isAdmin ? (
              <div className="rounded-xl border border-white/10 bg-white/[0.03] p-4 text-sm text-hpe-muted">
                Você está logado como personal. Para criar um atendimento, use a{' '}
                <Link href="/admin/agenda" className="text-hpe-orange hover:underline">
                  agenda do painel
                </Link>
                .
              </div>
            ) : signedIn ? (
              <button
                type="button"
                onClick={confirm}
                disabled={!slot || isPending}
                className="hpe-btn-primary w-full"
              >
                {isPending ? (
                  <>
                    <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-current border-t-transparent" />
                    Confirmando…
                  </>
                ) : (
                  <>
                    <CalendarCheck className="h-4 w-4" />
                    Confirmar agendamento
                  </>
                )}
              </button>
            ) : (
              <div className="space-y-3">
                <Link
                  href={`/entrar?next=${encodeURIComponent('/agendar')}`}
                  className="hpe-btn-primary w-full"
                >
                  <LogIn className="h-4 w-4" />
                  Entrar para confirmar
                </Link>
                <p className="text-xs leading-relaxed text-white/40">
                  Já é aluno? Entre com sua conta. Se ainda não treina com o Patrick,
                  fale com ele pelo WhatsApp para fazer o cadastro.
                </p>
                {whatsappLink(whatsapp) ? (
                  <a
                    href={whatsappLink(whatsapp)!}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="hpe-btn-ghost w-full"
                  >
                    <MessageCircle className="h-4 w-4" />
                    Falar no WhatsApp
                  </a>
                ) : null}
              </div>
            )}
          </div>

          <p className="mt-5 text-center text-[11px] leading-relaxed text-white/30">
            Passo {step} de 3 · a disponibilidade é confirmada no servidor no momento
            do agendamento.
          </p>
        </div>
      </aside>
    </div>
  );
}

function StepHeader({
  index,
  title,
  done,
}: {
  index: number;
  title: string;
  done: boolean;
}) {
  return (
    <div className="flex items-center gap-3">
      <span
        className={cn(
          'inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border text-sm font-bold',
          done
            ? 'border-hpe-orange bg-hpe-orange text-hpe-black'
            : 'border-white/15 text-hpe-muted',
        )}
      >
        {done ? <Check className="h-4 w-4" /> : index}
      </span>
      <h2 className="font-display text-lg font-bold uppercase tracking-wide">{title}</h2>
    </div>
  );
}

function Summary({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-baseline justify-between gap-4 border-b border-white/[0.05] pb-3">
      <dt className="text-xs font-semibold uppercase tracking-wider text-hpe-muted">
        {label}
      </dt>
      <dd className="text-right font-medium text-hpe-white">{value}</dd>
    </div>
  );
}
