'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { Plus } from 'lucide-react';
import { Field, SubmitButton } from '@/components/ui/Field';
import { useToast } from '@/components/ui/Toast';
import { createPlan } from '../actions';
import { SPLIT_PRESETS } from '@/lib/labels';
import { cn } from '@/lib/utils';

export function NewPlanForm({
  students,
  initialStudentId,
}: {
  students: { id: string; full_name: string }[];
  initialStudentId?: string;
}) {
  const router = useRouter();
  const toast = useToast();
  const [isPending, startTransition] = useTransition();

  const [isTemplate, setIsTemplate] = useState(false);
  const [studentId, setStudentId] = useState(initialStudentId ?? '');
  const [name, setName] = useState('');
  const [goal, setGoal] = useState('');
  const [notes, setNotes] = useState('');
  const [split, setSplit] = useState<string>('A/B/C');
  const [error, setError] = useState<string | null>(null);

  const days =
    SPLIT_PRESETS.find((preset) => preset.value === split)?.days ?? ([] as readonly string[]);

  function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);

    startTransition(async () => {
      const result = await createPlan({
        studentId: isTemplate ? null : studentId || null,
        name,
        goal: goal.trim() || null,
        split: split === 'custom' ? null : split,
        notes: notes.trim() || null,
        isTemplate,
        days: [...days],
      });

      if (!result.ok) {
        setError(result.message ?? 'Não foi possível criar a ficha.');
        return;
      }

      toast.success('Ficha criada. Agora monte os exercícios.');
      router.push(`/admin/fichas/${result.data?.id}`);
      router.refresh();
    });
  }

  return (
    <form onSubmit={onSubmit} className="space-y-6">
      <fieldset className="hpe-card p-5 sm:p-6">
        <legend className="hpe-display px-2 text-base">Destino</legend>

        <div className="mt-5 flex gap-2">
          {[
            { value: false, label: 'Ficha de um aluno' },
            { value: true, label: 'Modelo reutilizável' },
          ].map((option) => (
            <button
              key={String(option.value)}
              type="button"
              onClick={() => setIsTemplate(option.value)}
              className={cn(
                'flex-1 rounded-xl border px-4 py-3 text-sm font-medium transition-colors',
                isTemplate === option.value
                  ? 'border-hpe-orange/50 bg-hpe-orange/10 text-hpe-orange'
                  : 'border-white/10 text-hpe-muted hover:border-white/20',
              )}
            >
              {option.label}
            </button>
          ))}
        </div>

        {!isTemplate ? (
          <div className="mt-5">
            <Field label="Aluno" htmlFor="student" required>
              <select
                id="student"
                value={studentId}
                onChange={(e) => setStudentId(e.target.value)}
                className="hpe-select"
                required
              >
                <option value="">Selecione…</option>
                {students.map((student) => (
                  <option key={student.id} value={student.id}>
                    {student.full_name}
                  </option>
                ))}
              </select>
            </Field>
          </div>
        ) : (
          <p className="mt-5 text-sm text-hpe-muted">
            Modelos não ficam visíveis para alunos. Depois de montar, copie para quantos
            alunos quiser.
          </p>
        )}
      </fieldset>

      <fieldset className="hpe-card p-5 sm:p-6">
        <legend className="hpe-display px-2 text-base">Dados da ficha</legend>
        <div className="mt-5 space-y-5">
          <Field label="Nome da ficha" htmlFor="name" required>
            <input
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              minLength={2}
              placeholder="Ex.: Hipertrofia — Fase 1"
              className="hpe-input"
            />
          </Field>

          <Field label="Objetivo" htmlFor="goal">
            <input
              id="goal"
              value={goal}
              onChange={(e) => setGoal(e.target.value)}
              placeholder="Ex.: ganho de massa em membros superiores"
              className="hpe-input"
            />
          </Field>

          <div>
            <p className="hpe-label">Divisão</p>
            <div className="flex flex-wrap gap-2">
              {SPLIT_PRESETS.map((preset) => (
                <button
                  key={preset.value}
                  type="button"
                  onClick={() => setSplit(preset.value)}
                  className={cn(
                    'rounded-xl border px-4 py-2.5 text-sm font-medium transition-colors',
                    split === preset.value
                      ? 'border-hpe-orange bg-hpe-orange text-hpe-black'
                      : 'border-white/10 text-hpe-muted hover:border-white/20',
                  )}
                >
                  {preset.value}
                </button>
              ))}
              <button
                type="button"
                onClick={() => setSplit('custom')}
                className={cn(
                  'rounded-xl border px-4 py-2.5 text-sm font-medium transition-colors',
                  split === 'custom'
                    ? 'border-hpe-orange bg-hpe-orange text-hpe-black'
                    : 'border-white/10 text-hpe-muted hover:border-white/20',
                )}
              >
                Personalizada
              </button>
            </div>
            <p className="mt-2 text-xs text-hpe-muted">
              {split === 'custom'
                ? 'A ficha começa vazia — você adiciona os dias que quiser.'
                : `Serão criados os dias ${days.join(', ')}.`}
            </p>
          </div>

          <Field label="Observações gerais" htmlFor="notes">
            <textarea
              id="notes"
              rows={3}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="hpe-textarea"
              placeholder="Ex.: aquecer 5 min na esteira antes de iniciar."
            />
          </Field>
        </div>
      </fieldset>

      {error ? (
        <p
          role="alert"
          className="rounded-xl border border-red-500/25 bg-red-500/[0.07] px-4 py-3 text-sm text-red-300"
        >
          {error}
        </p>
      ) : null}

      <div className="flex flex-wrap gap-3">
        <SubmitButton pending={isPending} pendingLabel="Criando…">
          <Plus className="h-4 w-4" />
          Criar ficha
        </SubmitButton>
        <button
          type="button"
          onClick={() => router.back()}
          className="hpe-btn-subtle"
          disabled={isPending}
        >
          Cancelar
        </button>
      </div>
    </form>
  );
}
