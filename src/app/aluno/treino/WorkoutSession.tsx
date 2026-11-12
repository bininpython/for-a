'use client';

import { useCallback, useEffect, useRef, useState, useTransition } from 'react';
import {
  Check,
  ChevronLeft,
  ChevronRight,
  Dumbbell,
  Pause,
  Play,
  RotateCcw,
  Timer,
  Undo2,
} from 'lucide-react';
import { useToast } from '@/components/ui/Toast';
import { logSet, undoSet } from './actions';
import type { Exercise } from '@/lib/supabase/database.types';
import { cn, formatSeconds } from '@/lib/utils';

export interface SessionDay {
  id: string;
  label: string;
  title: string;
  notes: string | null;
  exercises: Exercise[];
}

export interface LoggedSet {
  id: string;
  exercise_id: string;
  set_number: number;
  reps_done: number | null;
  load_kg: number | null;
}

/** Histórico de carga do mesmo exercício, para o aluno comparar. */
export interface LastLoads {
  [exerciseId: string]: number | null;
}

export function WorkoutSession({
  days,
  initialDayId,
  todayLogs,
  lastLoads,
}: {
  days: SessionDay[];
  initialDayId?: string;
  todayLogs: LoggedSet[];
  lastLoads: LastLoads;
}) {
  const toast = useToast();
  const [isPending, startTransition] = useTransition();

  const [dayId, setDayId] = useState(
    days.find((d) => d.id === initialDayId)?.id ?? days[0]?.id ?? '',
  );
  const [index, setIndex] = useState(0);
  const [logs, setLogs] = useState<LoggedSet[]>(todayLogs);
  const [loadInput, setLoadInput] = useState('');
  const [repsInput, setRepsInput] = useState('');

  const day = days.find((d) => d.id === dayId);
  const exercise = day?.exercises[index];

  const doneSets = logs.filter((log) => log.exercise_id === exercise?.id).length;
  const totalSets = exercise?.sets ?? 0;
  const exerciseDone = totalSets > 0 && doneSets >= totalSets;

  const dayProgress = day
    ? day.exercises.reduce((sum, item) => {
        const done = logs.filter((log) => log.exercise_id === item.id).length;
        return sum + Math.min(done, item.sets);
      }, 0)
    : 0;
  const dayTotal = day?.exercises.reduce((sum, item) => sum + item.sets, 0) ?? 0;

  // ─── Cronômetro de descanso ──────────────────────────────────────────────
  const [restLeft, setRestLeft] = useState(0);
  const [restRunning, setRestRunning] = useState(false);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const stopTimer = useCallback(() => {
    if (intervalRef.current) clearInterval(intervalRef.current);
    intervalRef.current = null;
    setRestRunning(false);
  }, []);

  const beep = useCallback(() => {
    // Um bipe curto via Web Audio — sem arquivo externo para carregar.
    try {
      const Ctor =
        window.AudioContext ??
        (window as unknown as { webkitAudioContext?: typeof AudioContext })
          .webkitAudioContext;
      if (!Ctor) return;
      const ctx = new Ctor();
      const oscillator = ctx.createOscillator();
      const gain = ctx.createGain();
      oscillator.connect(gain);
      gain.connect(ctx.destination);
      oscillator.frequency.value = 880;
      gain.gain.setValueAtTime(0.0001, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.2, ctx.currentTime + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.45);
      oscillator.start();
      oscillator.stop(ctx.currentTime + 0.5);
      setTimeout(() => void ctx.close(), 700);
    } catch {
      // Áudio bloqueado pelo navegador: o cronômetro visual continua valendo.
    }
  }, []);

  useEffect(() => {
    if (!restRunning) return;
    intervalRef.current = setInterval(() => {
      setRestLeft((prev) => {
        if (prev <= 1) {
          stopTimer();
          beep();
          if ('vibrate' in navigator) navigator.vibrate?.(300);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [restRunning, stopTimer, beep]);

  useEffect(() => () => stopTimer(), [stopTimer]);

  function startRest(seconds: number) {
    setRestLeft(seconds);
    setRestRunning(true);
  }

  // ─── Navegação entre exercícios ──────────────────────────────────────────
  function goTo(nextIndex: number) {
    if (!day) return;
    const clamped = Math.max(0, Math.min(nextIndex, day.exercises.length - 1));
    setIndex(clamped);
    setLoadInput('');
    setRepsInput('');
    stopTimer();
    setRestLeft(0);
  }

  function changeDay(nextId: string) {
    setDayId(nextId);
    setIndex(0);
    setLoadInput('');
    setRepsInput('');
    stopTimer();
    setRestLeft(0);
  }

  // ─── Registro de série ───────────────────────────────────────────────────
  function completeSet() {
    if (!exercise) return;
    const setNumber = doneSets + 1;
    if (setNumber > exercise.sets) return;

    startTransition(async () => {
      const result = await logSet({
        exerciseId: exercise.id,
        dayId: day?.id ?? null,
        setNumber,
        repsDone: repsInput || null,
        loadKg: loadInput || exercise.load_kg || null,
      });

      if (!result.ok) {
        toast.error(result.message ?? 'Não foi possível registrar.');
        return;
      }

      // Otimista: o id definitivo chega no próximo carregamento da página.
      setLogs((prev) => [
        ...prev,
        {
          id: `temp-${exercise.id}-${setNumber}`,
          exercise_id: exercise.id,
          set_number: setNumber,
          reps_done: repsInput ? Number(repsInput) : null,
          load_kg: loadInput
            ? Number(loadInput.replace(',', '.'))
            : (exercise.load_kg ?? null),
        },
      ]);
      setRepsInput('');

      if (setNumber < exercise.sets) {
        startRest(exercise.rest_seconds);
      } else {
        toast.success(`${exercise.name} concluído.`);
        if (day && index < day.exercises.length - 1) {
          setTimeout(() => goTo(index + 1), 600);
        }
      }
    });
  }

  function undoLast() {
    if (!exercise) return;
    const last = [...logs]
      .reverse()
      .find((log) => log.exercise_id === exercise.id);
    if (!last) return;

    setLogs((prev) => prev.filter((log) => log !== last));

    if (!last.id.startsWith('temp-')) {
      startTransition(async () => {
        const result = await undoSet(last.id);
        if (!result.ok) toast.error(result.message ?? 'Não foi possível desfazer.');
      });
    }
  }

  if (days.length === 0 || !day || !exercise) return null;

  return (
    <>
      {/* ─── Seletor de dia ─────────────────────────────────────────────── */}
      <div className="no-scrollbar mb-5 flex gap-2 overflow-x-auto">
        {days.map((item) => (
          <button
            key={item.id}
            type="button"
            onClick={() => changeDay(item.id)}
            className={cn(
              'flex shrink-0 items-center gap-2.5 rounded-xl border px-4 py-2.5 transition-colors',
              item.id === dayId
                ? 'border-hpe-orange/50 bg-hpe-orange/10'
                : 'border-white/10 hover:border-white/20',
            )}
          >
            <span
              className={cn(
                'inline-flex h-7 w-7 items-center justify-center rounded-lg font-display text-sm font-extrabold',
                item.id === dayId
                  ? 'bg-hpe-orange text-hpe-black'
                  : 'bg-white/[0.06] text-hpe-muted',
              )}
            >
              {item.label}
            </span>
            <span
              className={cn(
                'whitespace-nowrap text-sm font-medium',
                item.id === dayId ? 'text-hpe-orange' : 'text-hpe-muted',
              )}
            >
              {item.title}
            </span>
          </button>
        ))}
      </div>

      {/* ─── Progresso do dia ───────────────────────────────────────────── */}
      <div className="mb-5">
        <div className="mb-2 flex items-center justify-between text-xs text-hpe-muted">
          <span>
            Exercício {index + 1} de {day.exercises.length}
          </span>
          <span className="tabular-nums">
            {dayProgress}/{dayTotal} séries
          </span>
        </div>
        <div className="h-1.5 overflow-hidden rounded-full bg-white/[0.06]">
          <div
            className="h-full rounded-full bg-hpe-orange transition-all duration-500 ease-hpe"
            style={{ width: `${dayTotal ? (dayProgress / dayTotal) * 100 : 0}%` }}
          />
        </div>
      </div>

      {/* ─── Exercício atual ────────────────────────────────────────────── */}
      <article className="hpe-card overflow-hidden">
        {exercise.media_url ? (
          <img
            src={exercise.media_url}
            alt={exercise.name}
            className="h-52 w-full border-b border-white/[0.07] object-cover sm:h-64"
          />
        ) : (
          <div className="flex h-36 items-center justify-center border-b border-white/[0.07] bg-white/[0.02]">
            <Dumbbell className="h-10 w-10 text-white/15" />
          </div>
        )}

        <div className="p-5 sm:p-6">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <h2 className="hpe-display text-xl sm:text-2xl">{exercise.name}</h2>
              {exercise.muscle_group ? (
                <p className="mt-1 text-sm text-hpe-muted">{exercise.muscle_group}</p>
              ) : null}
            </div>
            {exerciseDone ? (
              <span className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-emerald-500/30 bg-emerald-500/10">
                <Check className="h-4 w-4 text-emerald-400" />
              </span>
            ) : null}
          </div>

          <div className="mt-5 grid grid-cols-3 gap-3">
            <Spec label="Séries" value={String(exercise.sets)} />
            <Spec label="Repetições" value={exercise.reps} />
            <Spec
              label="Descanso"
              value={formatSeconds(exercise.rest_seconds)}
            />
          </div>

          {exercise.notes ? (
            <p className="mt-4 rounded-xl border border-white/10 bg-white/[0.02] px-4 py-3 text-sm leading-relaxed text-hpe-muted">
              {exercise.notes}
            </p>
          ) : null}

          {/* ─── Séries ─────────────────────────────────────────────────── */}
          <div className="mt-6">
            <div className="mb-3 flex items-center justify-between">
              <p className="text-xs font-semibold uppercase tracking-wider text-hpe-muted">
                Séries concluídas
              </p>
              {doneSets > 0 ? (
                <button
                  type="button"
                  onClick={undoLast}
                  disabled={isPending}
                  className="inline-flex items-center gap-1.5 text-xs text-hpe-muted transition-colors hover:text-hpe-white"
                >
                  <Undo2 className="h-3.5 w-3.5" />
                  Desfazer última
                </button>
              ) : null}
            </div>

            <div className="flex flex-wrap gap-2">
              {Array.from({ length: exercise.sets }, (_, i) => {
                const log = logs.find(
                  (item) => item.exercise_id === exercise.id && item.set_number === i + 1,
                );
                return (
                  <div
                    key={i}
                    className={cn(
                      'flex min-w-[4.5rem] flex-col items-center rounded-xl border px-3 py-2',
                      log
                        ? 'border-hpe-orange/50 bg-hpe-orange/10'
                        : 'border-white/10 bg-white/[0.02]',
                    )}
                  >
                    <span className="text-[10px] uppercase tracking-wider text-hpe-muted">
                      Série {i + 1}
                    </span>
                    <span
                      className={cn(
                        'mt-0.5 text-sm font-semibold tabular-nums',
                        log ? 'text-hpe-orange' : 'text-white/25',
                      )}
                    >
                      {log
                        ? `${log.reps_done ?? '—'}${log.load_kg ? ` · ${log.load_kg}kg` : ''}`
                        : '—'}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* ─── Registro ───────────────────────────────────────────────── */}
          {!exerciseDone ? (
            <div className="mt-6 grid gap-3 sm:grid-cols-[1fr_1fr_auto]">
              <label className="block">
                <span className="mb-1 block text-xs text-hpe-muted">
                  Repetições feitas
                </span>
                <input
                  inputMode="numeric"
                  value={repsInput}
                  onChange={(e) => setRepsInput(e.target.value)}
                  placeholder={exercise.reps}
                  className="hpe-input"
                />
              </label>

              <label className="block">
                <span className="mb-1 block text-xs text-hpe-muted">
                  Carga usada (kg)
                  {lastLoads[exercise.id] ? (
                    <span className="ml-1 text-white/35">
                      · anterior {lastLoads[exercise.id]}kg
                    </span>
                  ) : null}
                </span>
                <input
                  inputMode="decimal"
                  value={loadInput}
                  onChange={(e) => setLoadInput(e.target.value)}
                  placeholder={
                    exercise.load_kg
                      ? String(exercise.load_kg)
                      : (lastLoads[exercise.id]?.toString() ?? '0')
                  }
                  className="hpe-input"
                />
              </label>

              <button
                type="button"
                onClick={completeSet}
                disabled={isPending}
                className="hpe-btn-primary h-[46px] self-end"
              >
                <Check className="h-4 w-4" />
                Série {doneSets + 1}
              </button>
            </div>
          ) : (
            <p className="mt-6 rounded-xl border border-emerald-500/25 bg-emerald-500/[0.07] px-4 py-3 text-center text-sm text-emerald-300">
              Todas as séries deste exercício foram concluídas.
            </p>
          )}
        </div>
      </article>

      {/* ─── Cronômetro de descanso ─────────────────────────────────────── */}
      {restLeft > 0 || restRunning ? (
        <div className="fixed inset-x-0 bottom-0 z-40 border-t border-hpe-orange/30 bg-hpe-black-2/95 px-5 py-4 backdrop-blur-xl">
          <div className="mx-auto flex max-w-2xl items-center gap-4">
            <Timer className="h-5 w-5 shrink-0 text-hpe-orange" />
            <div className="min-w-0 flex-1">
              <p className="text-xs uppercase tracking-wider text-hpe-muted">
                Descanso
              </p>
              <p className="hpe-display text-2xl tabular-nums text-hpe-orange">
                {formatSeconds(restLeft)}
              </p>
            </div>
            <button
              type="button"
              onClick={() => setRestRunning((v) => !v)}
              aria-label={restRunning ? 'Pausar' : 'Continuar'}
              className="rounded-xl border border-white/10 p-2.5 text-hpe-white transition-colors hover:bg-white/5"
            >
              {restRunning ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
            </button>
            <button
              type="button"
              onClick={() => {
                stopTimer();
                setRestLeft(0);
              }}
              className="hpe-btn-subtle hpe-btn-sm"
            >
              Pular
            </button>
          </div>
        </div>
      ) : null}

      {/* ─── Navegação ──────────────────────────────────────────────────── */}
      <div className="mt-5 flex items-center justify-between gap-3">
        <button
          type="button"
          onClick={() => goTo(index - 1)}
          disabled={index === 0}
          className="hpe-btn-ghost hpe-btn-sm"
        >
          <ChevronLeft className="h-4 w-4" />
          Anterior
        </button>

        <button
          type="button"
          onClick={() => startRest(exercise.rest_seconds)}
          className="hpe-btn-subtle hpe-btn-sm"
        >
          <RotateCcw className="h-4 w-4" />
          Descanso
        </button>

        <button
          type="button"
          onClick={() => goTo(index + 1)}
          disabled={index === day.exercises.length - 1}
          className="hpe-btn-ghost hpe-btn-sm"
        >
          Próximo
          <ChevronRight className="h-4 w-4" />
        </button>
      </div>
    </>
  );
}

function Spec({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-3 text-center">
      <p className="text-[10px] font-semibold uppercase tracking-wider text-hpe-muted">
        {label}
      </p>
      <p className="mt-1 font-display text-lg font-bold tabular-nums">{value}</p>
    </div>
  );
}
