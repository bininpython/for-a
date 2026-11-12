'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import {
  ChevronDown,
  ChevronUp,
  Copy,
  Dumbbell,
  Eye,
  EyeOff,
  GripVertical,
  Pencil,
  Plus,
  Trash2,
} from 'lucide-react';
import { Badge } from '@/components/ui/Badge';
import { Modal } from '@/components/ui/Modal';
import { Field } from '@/components/ui/Field';
import { EmptyState } from '@/components/ui/EmptyState';
import { useToast } from '@/components/ui/Toast';
import {
  addDay,
  addExercise,
  deleteDay,
  deleteExercise,
  deletePlan,
  duplicatePlan,
  reorderExercises,
  setPlanPublished,
  updateDay,
  updateExercise,
  updatePlan,
} from '../actions';
import type { Exercise, TrainingDay, TrainingPlan } from '@/lib/supabase/database.types';
import { MUSCLE_GROUPS } from '@/lib/labels';
import { cn, formatSeconds } from '@/lib/utils';

export interface DayWithExercises extends TrainingDay {
  exercises: Exercise[];
}

const EMPTY_EXERCISE = {
  name: '',
  muscle_group: '',
  media_url: '',
  sets: '3',
  reps: '10',
  load_kg: '',
  rest_seconds: '60',
  notes: '',
};

type ExerciseDraft = typeof EMPTY_EXERCISE;

export function PlanEditor({
  plan,
  days,
  students,
  studentName,
}: {
  plan: TrainingPlan;
  days: DayWithExercises[];
  students: { id: string; full_name: string }[];
  studentName: string | null;
}) {
  const router = useRouter();
  const toast = useToast();
  const [isPending, startTransition] = useTransition();

  const [editingPlan, setEditingPlan] = useState(false);
  const [copyOpen, setCopyOpen] = useState(false);
  const [dayModal, setDayModal] = useState<{ day?: DayWithExercises } | null>(null);
  const [exerciseModal, setExerciseModal] = useState<{
    dayId: string;
    exercise?: Exercise;
  } | null>(null);

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

  function move(day: DayWithExercises, index: number, direction: -1 | 1) {
    const next = [...day.exercises];
    const target = index + direction;
    if (target < 0 || target >= next.length) return;
    [next[index], next[target]] = [next[target], next[index]];
    run(
      () => reorderExercises(plan.id, next.map((e) => e.id)),
      'Ordem atualizada.',
    );
  }

  return (
    <>
      {/* ─── Barra de ações ──────────────────────────────────────────────── */}
      <div className="mb-6 flex flex-wrap gap-2.5">
        <button
          type="button"
          onClick={() => setEditingPlan(true)}
          className="hpe-btn-ghost hpe-btn-sm"
        >
          <Pencil className="h-4 w-4" />
          Editar dados
        </button>

        {!plan.is_template ? (
          <button
            type="button"
            disabled={isPending}
            onClick={() =>
              run(
                () => setPlanPublished(plan.id, !plan.published),
                plan.published
                  ? 'Ficha despublicada.'
                  : 'Ficha publicada para o aluno.',
              )
            }
            className={plan.published ? 'hpe-btn-subtle hpe-btn-sm' : 'hpe-btn-primary hpe-btn-sm'}
          >
            {plan.published ? (
              <>
                <EyeOff className="h-4 w-4" />
                Despublicar
              </>
            ) : (
              <>
                <Eye className="h-4 w-4" />
                Publicar para o aluno
              </>
            )}
          </button>
        ) : null}

        <button
          type="button"
          onClick={() => setCopyOpen(true)}
          className="hpe-btn-ghost hpe-btn-sm"
        >
          <Copy className="h-4 w-4" />
          Copiar ficha
        </button>

        <button
          type="button"
          disabled={isPending}
          onClick={() => {
            if (!confirm('Excluir esta ficha e todos os seus exercícios?')) return;
            startTransition(async () => {
              const result = await deletePlan(plan.id);
              if (result.ok) {
                toast.success('Ficha excluída.');
                router.push('/admin/fichas');
                router.refresh();
              } else {
                toast.error(result.message ?? 'Não foi possível excluir.');
              }
            });
          }}
          className="hpe-btn-danger hpe-btn-sm"
        >
          <Trash2 className="h-4 w-4" />
          Excluir
        </button>
      </div>

      {/* ─── Dias ────────────────────────────────────────────────────────── */}
      {days.length === 0 ? (
        <EmptyState
          icon={Dumbbell}
          title="Nenhum dia de treino"
          description="Adicione TREINO A, TREINO B… e monte os exercícios de cada um."
          action={
            <button
              type="button"
              onClick={() => setDayModal({})}
              className="hpe-btn-primary hpe-btn-sm"
            >
              <Plus className="h-4 w-4" />
              Adicionar dia
            </button>
          }
        />
      ) : (
        <div className="space-y-5">
          {days.map((day) => (
            <section key={day.id} className="hpe-card overflow-hidden">
              <header className="flex flex-wrap items-center gap-3 border-b border-white/[0.07] px-5 py-4">
                <span className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-hpe-orange font-display text-lg font-extrabold text-hpe-black">
                  {day.label}
                </span>
                <div className="min-w-0 flex-1">
                  <h2 className="font-display text-base font-bold uppercase tracking-wide">
                    Treino {day.label} — {day.title}
                  </h2>
                  <p className="text-xs text-hpe-muted">
                    {day.exercises.length} exercício
                    {day.exercises.length === 1 ? '' : 's'}
                    {day.notes ? ` · ${day.notes}` : ''}
                  </p>
                </div>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setDayModal({ day })}
                    title="Editar dia"
                    className="rounded-lg border border-white/10 p-2 text-hpe-muted transition-colors hover:text-hpe-white"
                  >
                    <Pencil className="h-4 w-4" />
                  </button>
                  <button
                    type="button"
                    disabled={isPending}
                    onClick={() => {
                      if (!confirm(`Excluir o treino ${day.label}?`)) return;
                      run(() => deleteDay(day.id, plan.id), 'Dia excluído.');
                    }}
                    title="Excluir dia"
                    className="rounded-lg border border-white/10 p-2 text-hpe-muted transition-colors hover:text-red-300"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </header>

              {day.exercises.length === 0 ? (
                <p className="px-5 py-8 text-center text-sm text-hpe-muted">
                  Nenhum exercício neste dia.
                </p>
              ) : (
                <ul className="divide-y divide-white/[0.05]">
                  {day.exercises.map((exercise, index) => (
                    <li
                      key={exercise.id}
                      className="flex flex-col gap-3 px-5 py-4 sm:flex-row sm:items-center"
                    >
                      <div className="flex shrink-0 flex-col text-hpe-muted">
                        <button
                          type="button"
                          onClick={() => move(day, index, -1)}
                          disabled={index === 0 || isPending}
                          aria-label="Subir"
                          className="transition-colors hover:text-hpe-white disabled:opacity-20"
                        >
                          <ChevronUp className="h-4 w-4" />
                        </button>
                        <GripVertical className="h-4 w-4 opacity-30" />
                        <button
                          type="button"
                          onClick={() => move(day, index, 1)}
                          disabled={index === day.exercises.length - 1 || isPending}
                          aria-label="Descer"
                          className="transition-colors hover:text-hpe-white disabled:opacity-20"
                        >
                          <ChevronDown className="h-4 w-4" />
                        </button>
                      </div>

                      {exercise.media_url ? (
                        <img
                          src={exercise.media_url}
                          alt=""
                          className="h-14 w-14 shrink-0 rounded-xl border border-white/10 object-cover"
                        />
                      ) : (
                        <span className="inline-flex h-14 w-14 shrink-0 items-center justify-center rounded-xl border border-white/10 bg-white/[0.02]">
                          <Dumbbell className="h-5 w-5 text-white/20" />
                        </span>
                      )}

                      <div className="min-w-0 flex-1">
                        <p className="font-medium">
                          <span className="mr-2 text-hpe-muted tabular-nums">
                            {index + 1}.
                          </span>
                          {exercise.name}
                        </p>
                        <p className="mt-0.5 text-xs text-hpe-muted">
                          {[
                            exercise.muscle_group,
                            `${exercise.sets} × ${exercise.reps}`,
                            exercise.load_kg ? `${exercise.load_kg} kg` : null,
                            `descanso ${formatSeconds(exercise.rest_seconds)}`,
                          ]
                            .filter(Boolean)
                            .join(' · ')}
                        </p>
                        {exercise.notes ? (
                          <p className="mt-1 text-xs text-white/40">{exercise.notes}</p>
                        ) : null}
                      </div>

                      <div className="flex gap-2">
                        <button
                          type="button"
                          onClick={() => setExerciseModal({ dayId: day.id, exercise })}
                          title="Editar exercício"
                          className="rounded-lg border border-white/10 p-2 text-hpe-muted transition-colors hover:text-hpe-white"
                        >
                          <Pencil className="h-4 w-4" />
                        </button>
                        <button
                          type="button"
                          disabled={isPending}
                          onClick={() =>
                            run(
                              () => deleteExercise(exercise.id, plan.id),
                              'Exercício removido.',
                            )
                          }
                          title="Remover exercício"
                          className="rounded-lg border border-white/10 p-2 text-hpe-muted transition-colors hover:text-red-300"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </li>
                  ))}
                </ul>
              )}

              <div className="border-t border-white/[0.07] px-5 py-3">
                <button
                  type="button"
                  onClick={() => setExerciseModal({ dayId: day.id })}
                  className="hpe-btn-subtle hpe-btn-sm"
                >
                  <Plus className="h-4 w-4" />
                  Adicionar exercício
                </button>
              </div>
            </section>
          ))}

          <button
            type="button"
            onClick={() => setDayModal({})}
            className="hpe-btn-ghost w-full"
          >
            <Plus className="h-4 w-4" />
            Adicionar dia de treino
          </button>
        </div>
      )}

      {/* ─── Modais ──────────────────────────────────────────────────────── */}
      <PlanDataModal
        open={editingPlan}
        onClose={() => setEditingPlan(false)}
        plan={plan}
        onSaved={() => {
          setEditingPlan(false);
          router.refresh();
        }}
      />

      <DayModal
        state={dayModal}
        planId={plan.id}
        onClose={() => setDayModal(null)}
        onSaved={() => {
          setDayModal(null);
          router.refresh();
        }}
      />

      <ExerciseModal
        state={exerciseModal}
        planId={plan.id}
        onClose={() => setExerciseModal(null)}
        onSaved={() => {
          setExerciseModal(null);
          router.refresh();
        }}
      />

      <CopyModal
        open={copyOpen}
        onClose={() => setCopyOpen(false)}
        planId={plan.id}
        students={students}
        currentStudent={studentName}
      />
    </>
  );
}

// ─── Modal: dados da ficha ──────────────────────────────────────────────────
function PlanDataModal({
  open,
  onClose,
  plan,
  onSaved,
}: {
  open: boolean;
  onClose: () => void;
  plan: TrainingPlan;
  onSaved: () => void;
}) {
  const toast = useToast();
  const [isPending, startTransition] = useTransition();
  const [name, setName] = useState(plan.name);
  const [goal, setGoal] = useState(plan.goal ?? '');
  const [split, setSplit] = useState(plan.split ?? '');
  const [notes, setNotes] = useState(plan.notes ?? '');

  function save() {
    startTransition(async () => {
      const result = await updatePlan(plan.id, {
        name,
        goal: goal.trim() || null,
        split: split.trim() || null,
        notes: notes.trim() || null,
      });
      if (result.ok) {
        toast.success('Ficha atualizada.');
        onSaved();
      } else {
        toast.error(result.message ?? 'Não foi possível salvar.');
      }
    });
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Dados da ficha"
      size="sm"
      footer={
        <>
          <button type="button" onClick={onClose} className="hpe-btn-subtle">
            Cancelar
          </button>
          <button
            type="button"
            onClick={save}
            disabled={isPending}
            className="hpe-btn-primary"
          >
            {isPending ? 'Salvando…' : 'Salvar'}
          </button>
        </>
      }
    >
      <div className="space-y-5">
        <Field label="Nome" htmlFor="plan-name" required>
          <input
            id="plan-name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="hpe-input"
          />
        </Field>
        <Field label="Objetivo" htmlFor="plan-goal">
          <input
            id="plan-goal"
            value={goal}
            onChange={(e) => setGoal(e.target.value)}
            className="hpe-input"
          />
        </Field>
        <Field label="Divisão" htmlFor="plan-split">
          <input
            id="plan-split"
            value={split}
            onChange={(e) => setSplit(e.target.value)}
            placeholder="A/B/C"
            className="hpe-input"
          />
        </Field>
        <Field label="Observações" htmlFor="plan-notes">
          <textarea
            id="plan-notes"
            rows={3}
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            className="hpe-textarea"
          />
        </Field>
      </div>
    </Modal>
  );
}

// ─── Modal: dia ─────────────────────────────────────────────────────────────
function DayModal({
  state,
  planId,
  onClose,
  onSaved,
}: {
  state: { day?: DayWithExercises } | null;
  planId: string;
  onClose: () => void;
  onSaved: () => void;
}) {
  const toast = useToast();
  const [isPending, startTransition] = useTransition();
  const [label, setLabel] = useState('');
  const [title, setTitle] = useState('');
  const [notes, setNotes] = useState('');
  const [initialized, setInitialized] = useState<string | null>(null);

  // Sincroniza os campos ao abrir o modal para um dia específico.
  const key = state?.day?.id ?? (state ? 'new' : null);
  if (state && initialized !== key) {
    setLabel(state.day?.label ?? '');
    setTitle(state.day?.title ?? '');
    setNotes(state.day?.notes ?? '');
    setInitialized(key);
  }
  if (!state && initialized !== null) setInitialized(null);

  function save() {
    startTransition(async () => {
      const result = state?.day
        ? await updateDay(state.day.id, planId, {
            label: label.trim().toUpperCase(),
            title: title.trim(),
            notes: notes.trim() || null,
          })
        : await addDay(planId, label, title);

      if (result.ok) {
        toast.success(state?.day ? 'Dia atualizado.' : 'Dia adicionado.');
        onSaved();
      } else {
        toast.error(result.message ?? 'Não foi possível salvar.');
      }
    });
  }

  return (
    <Modal
      open={Boolean(state)}
      onClose={onClose}
      title={state?.day ? 'Editar dia' : 'Novo dia de treino'}
      size="sm"
      footer={
        <>
          <button type="button" onClick={onClose} className="hpe-btn-subtle">
            Cancelar
          </button>
          <button
            type="button"
            onClick={save}
            disabled={isPending || !label.trim()}
            className="hpe-btn-primary"
          >
            {isPending ? 'Salvando…' : 'Salvar'}
          </button>
        </>
      }
    >
      <div className="space-y-5">
        <Field label="Letra" htmlFor="day-label" required hint="A, B, C…">
          <input
            id="day-label"
            value={label}
            onChange={(e) => setLabel(e.target.value.toUpperCase().slice(0, 4))}
            maxLength={4}
            className="hpe-input uppercase"
          />
        </Field>
        <Field label="Grupo muscular" htmlFor="day-title" required>
          <input
            id="day-title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Ex.: PEITO E TRÍCEPS"
            className="hpe-input"
          />
        </Field>
        <Field label="Observações do dia" htmlFor="day-notes">
          <textarea
            id="day-notes"
            rows={2}
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            className="hpe-textarea"
          />
        </Field>
      </div>
    </Modal>
  );
}

// ─── Modal: exercício ───────────────────────────────────────────────────────
function ExerciseModal({
  state,
  planId,
  onClose,
  onSaved,
}: {
  state: { dayId: string; exercise?: Exercise } | null;
  planId: string;
  onClose: () => void;
  onSaved: () => void;
}) {
  const toast = useToast();
  const [isPending, startTransition] = useTransition();
  const [draft, setDraft] = useState<ExerciseDraft>(EMPTY_EXERCISE);
  const [initialized, setInitialized] = useState<string | null>(null);

  const key = state ? (state.exercise?.id ?? `new-${state.dayId}`) : null;
  if (state && initialized !== key) {
    setDraft(
      state.exercise
        ? {
            name: state.exercise.name,
            muscle_group: state.exercise.muscle_group ?? '',
            media_url: state.exercise.media_url ?? '',
            sets: String(state.exercise.sets),
            reps: state.exercise.reps,
            load_kg: state.exercise.load_kg === null ? '' : String(state.exercise.load_kg),
            rest_seconds: String(state.exercise.rest_seconds),
            notes: state.exercise.notes ?? '',
          }
        : EMPTY_EXERCISE,
    );
    setInitialized(key);
  }
  if (!state && initialized !== null) setInitialized(null);

  function field<K extends keyof ExerciseDraft>(name: K, value: ExerciseDraft[K]) {
    setDraft((prev) => ({ ...prev, [name]: value }));
  }

  function save() {
    if (!state) return;
    const payload = {
      name: draft.name,
      muscle_group: draft.muscle_group || null,
      media_url: draft.media_url,
      sets: draft.sets,
      reps: draft.reps,
      load_kg: draft.load_kg === '' ? null : draft.load_kg,
      rest_seconds: draft.rest_seconds,
      notes: draft.notes || null,
    };

    startTransition(async () => {
      const result = state.exercise
        ? await updateExercise(state.exercise.id, planId, payload)
        : await addExercise(state.dayId, planId, payload);

      if (result.ok) {
        toast.success(state.exercise ? 'Exercício atualizado.' : 'Exercício adicionado.');
        onSaved();
      } else {
        toast.error(result.message ?? 'Não foi possível salvar.');
      }
    });
  }

  return (
    <Modal
      open={Boolean(state)}
      onClose={onClose}
      title={state?.exercise ? 'Editar exercício' : 'Novo exercício'}
      footer={
        <>
          <button type="button" onClick={onClose} className="hpe-btn-subtle">
            Cancelar
          </button>
          <button
            type="button"
            onClick={save}
            disabled={isPending || draft.name.trim().length < 2}
            className="hpe-btn-primary"
          >
            {isPending ? 'Salvando…' : 'Salvar'}
          </button>
        </>
      }
    >
      <div className="grid gap-5 sm:grid-cols-2">
        <Field label="Nome do exercício" htmlFor="ex-name" required className="sm:col-span-2">
          <input
            id="ex-name"
            value={draft.name}
            onChange={(e) => field('name', e.target.value)}
            placeholder="Ex.: Supino reto"
            className="hpe-input"
          />
        </Field>

        <Field label="Grupo muscular" htmlFor="ex-group">
          <input
            id="ex-group"
            list="muscle-groups"
            value={draft.muscle_group}
            onChange={(e) => field('muscle_group', e.target.value)}
            className="hpe-input"
          />
          <datalist id="muscle-groups">
            {MUSCLE_GROUPS.map((group) => (
              <option key={group} value={group} />
            ))}
          </datalist>
        </Field>

        <Field
          label="Imagem demonstrativa"
          htmlFor="ex-media"
          hint="URL de uma imagem ou GIF do movimento."
        >
          <input
            id="ex-media"
            type="url"
            value={draft.media_url}
            onChange={(e) => field('media_url', e.target.value)}
            placeholder="https://…"
            className="hpe-input"
          />
        </Field>

        <Field label="Séries" htmlFor="ex-sets" required>
          <input
            id="ex-sets"
            type="number"
            min={1}
            max={20}
            value={draft.sets}
            onChange={(e) => field('sets', e.target.value)}
            className="hpe-input"
          />
        </Field>

        <Field label="Repetições" htmlFor="ex-reps" required hint="Ex.: 10, 8-12, até a falha">
          <input
            id="ex-reps"
            value={draft.reps}
            onChange={(e) => field('reps', e.target.value)}
            className="hpe-input"
          />
        </Field>

        <Field label="Carga (kg)" htmlFor="ex-load" hint="Opcional — o aluno registra a real.">
          <input
            id="ex-load"
            type="number"
            min={0}
            step="0.5"
            value={draft.load_kg}
            onChange={(e) => field('load_kg', e.target.value)}
            className="hpe-input"
          />
        </Field>

        <Field label="Descanso (segundos)" htmlFor="ex-rest" required>
          <input
            id="ex-rest"
            type="number"
            min={0}
            max={900}
            step={5}
            value={draft.rest_seconds}
            onChange={(e) => field('rest_seconds', e.target.value)}
            className="hpe-input"
          />
        </Field>

        <Field label="Observações" htmlFor="ex-notes" className="sm:col-span-2">
          <textarea
            id="ex-notes"
            rows={2}
            value={draft.notes}
            onChange={(e) => field('notes', e.target.value)}
            placeholder="Ex.: descer controlado em 3 segundos."
            className="hpe-textarea"
          />
        </Field>
      </div>
    </Modal>
  );
}

// ─── Modal: copiar ficha ────────────────────────────────────────────────────
function CopyModal({
  open,
  onClose,
  planId,
  students,
  currentStudent,
}: {
  open: boolean;
  onClose: () => void;
  planId: string;
  students: { id: string; full_name: string }[];
  currentStudent: string | null;
}) {
  const router = useRouter();
  const toast = useToast();
  const [isPending, startTransition] = useTransition();
  const [target, setTarget] = useState<string>('');

  function copy() {
    startTransition(async () => {
      const result = await duplicatePlan(planId, target || null);
      if (result.ok) {
        toast.success(target ? 'Ficha copiada para o aluno.' : 'Modelo criado.');
        onClose();
        router.push(`/admin/fichas/${result.data?.id}`);
        router.refresh();
      } else {
        toast.error(result.message ?? 'Não foi possível copiar.');
      }
    });
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Copiar ficha"
      description="A cópia leva todos os dias e exercícios, e começa como rascunho."
      size="sm"
      footer={
        <>
          <button type="button" onClick={onClose} className="hpe-btn-subtle">
            Cancelar
          </button>
          <button
            type="button"
            onClick={copy}
            disabled={isPending}
            className="hpe-btn-primary"
          >
            {isPending ? 'Copiando…' : 'Copiar'}
          </button>
        </>
      }
    >
      <Field label="Destino" htmlFor="copy-target">
        <select
          id="copy-target"
          value={target}
          onChange={(e) => setTarget(e.target.value)}
          className="hpe-select"
        >
          <option value="">Salvar como modelo reutilizável</option>
          {students.map((student) => (
            <option key={student.id} value={student.id}>
              {student.full_name}
              {student.full_name === currentStudent ? ' (mesmo aluno)' : ''}
            </option>
          ))}
        </select>
      </Field>
    </Modal>
  );
}

export function PlanBadges({ plan }: { plan: TrainingPlan }) {
  return (
    <div className={cn('flex flex-wrap gap-2')}>
      {plan.is_template ? (
        <Badge tone="blue">Modelo</Badge>
      ) : (
        <Badge tone={plan.published ? 'green' : 'gray'} dot>
          {plan.published ? 'Publicada' : 'Rascunho'}
        </Badge>
      )}
      {plan.split ? <Badge tone="gray">{plan.split}</Badge> : null}
    </div>
  );
}
