'use client';

import { useState, useTransition } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Plus, Ruler, Trash2 } from 'lucide-react';
import { Modal } from '@/components/ui/Modal';
import { Field } from '@/components/ui/Field';
import { EmptyState } from '@/components/ui/EmptyState';
import { useToast } from '@/components/ui/Toast';
import { createAssessment, deleteAssessment } from './actions';
import { MEASUREMENT_SITES } from '@/lib/labels';
import { formatDate, todayISO } from '@/lib/utils';

export interface AssessmentRow {
  id: string;
  student_id: string;
  assessed_on: string;
  weight_kg: number | null;
  height_cm: number | null;
  body_fat_pct: number | null;
  lean_mass_kg: number | null;
  resting_hr: number | null;
  notes: string | null;
  student_name: string;
  measurements: { site: string; value_cm: number }[];
}

export function AssessmentsClient({
  assessments,
  students,
  initialStudentId,
}: {
  assessments: AssessmentRow[];
  students: { id: string; full_name: string }[];
  initialStudentId?: string;
}) {
  const router = useRouter();
  const toast = useToast();
  const [isPending, startTransition] = useTransition();
  const [open, setOpen] = useState(false);

  return (
    <>
      <div className="mb-6">
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="hpe-btn-primary hpe-btn-sm"
        >
          <Plus className="h-4 w-4" />
          Nova avaliação
        </button>
      </div>

      {assessments.length === 0 ? (
        <EmptyState
          icon={Ruler}
          title="Nenhuma avaliação registrada"
          description="Peso, medidas e composição corporal alimentam os gráficos de evolução do aluno."
          action={
            <button
              type="button"
              onClick={() => setOpen(true)}
              className="hpe-btn-primary hpe-btn-sm"
            >
              Registrar a primeira
            </button>
          }
        />
      ) : (
        <div className="space-y-4">
          {assessments.map((item) => (
            <article key={item.id} className="hpe-card p-5 sm:p-6">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <Link
                    href={`/admin/alunos/${item.student_id}?aba=avaliacoes`}
                    className="font-display text-base font-bold uppercase tracking-wide hover:text-hpe-orange"
                  >
                    {item.student_name}
                  </Link>
                  <p className="mt-1 text-sm text-hpe-muted">
                    {formatDate(item.assessed_on, {
                      day: '2-digit',
                      month: 'long',
                      year: 'numeric',
                    })}
                  </p>
                </div>
                <button
                  type="button"
                  disabled={isPending}
                  onClick={() => {
                    if (!confirm('Excluir esta avaliação?')) return;
                    startTransition(async () => {
                      const result = await deleteAssessment(item.id);
                      if (result.ok) {
                        toast.success('Avaliação excluída.');
                        router.refresh();
                      } else {
                        toast.error(result.message ?? 'Não foi possível excluir.');
                      }
                    });
                  }}
                  className="rounded-lg border border-white/10 p-2 text-hpe-muted transition-colors hover:text-red-300"
                  title="Excluir avaliação"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>

              <div className="mt-4 grid gap-3 sm:grid-cols-3 lg:grid-cols-5">
                <Metric label="Peso" value={item.weight_kg} unit=" kg" />
                <Metric label="Altura" value={item.height_cm} unit=" cm" />
                <Metric label="% Gordura" value={item.body_fat_pct} unit="%" />
                <Metric label="Massa magra" value={item.lean_mass_kg} unit=" kg" />
                <Metric label="FC repouso" value={item.resting_hr} unit=" bpm" />
              </div>

              {item.measurements.length ? (
                <div className="mt-5 flex flex-wrap gap-2 border-t border-white/[0.06] pt-4">
                  {item.measurements.map((m) => (
                    <span
                      key={m.site}
                      className="rounded-lg border border-white/10 bg-white/[0.02] px-3 py-1.5 text-xs"
                    >
                      {m.site}: <strong className="tabular-nums">{m.value_cm} cm</strong>
                    </span>
                  ))}
                </div>
              ) : null}

              {item.notes ? (
                <p className="mt-4 border-t border-white/[0.06] pt-4 text-sm leading-relaxed text-hpe-muted">
                  {item.notes}
                </p>
              ) : null}
            </article>
          ))}
        </div>
      )}

      <AssessmentModal
        open={open}
        onClose={() => setOpen(false)}
        students={students}
        initialStudentId={initialStudentId}
        onSaved={() => {
          setOpen(false);
          router.refresh();
        }}
      />
    </>
  );
}

function Metric({
  label,
  value,
  unit,
}: {
  label: string;
  value: number | null;
  unit: string;
}) {
  return (
    <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-3">
      <p className="text-[10px] font-semibold uppercase tracking-wider text-hpe-muted">
        {label}
      </p>
      <p className="mt-1 font-display text-lg font-bold tabular-nums">
        {value === null ? '—' : `${value}${unit}`}
      </p>
    </div>
  );
}

function AssessmentModal({
  open,
  onClose,
  students,
  initialStudentId,
  onSaved,
}: {
  open: boolean;
  onClose: () => void;
  students: { id: string; full_name: string }[];
  initialStudentId?: string;
  onSaved: () => void;
}) {
  const toast = useToast();
  const [isPending, startTransition] = useTransition();
  const [studentId, setStudentId] = useState(initialStudentId ?? '');
  const [assessedOn, setAssessedOn] = useState(todayISO());
  const [weight, setWeight] = useState('');
  const [height, setHeight] = useState('');
  const [bodyFat, setBodyFat] = useState('');
  const [leanMass, setLeanMass] = useState('');
  const [restingHr, setRestingHr] = useState('');
  const [notes, setNotes] = useState('');
  const [measurements, setMeasurements] = useState<Record<string, string>>({});

  function save() {
    if (!studentId) {
      toast.error('Selecione o aluno.');
      return;
    }

    startTransition(async () => {
      const result = await createAssessment({
        studentId,
        assessedOn,
        weightKg: weight,
        heightCm: height,
        bodyFatPct: bodyFat,
        leanMassKg: leanMass,
        restingHr,
        notes: notes.trim() || null,
        measurements: Object.entries(measurements)
          .filter(([, value]) => value.trim() !== '')
          .map(([site, valueCm]) => ({ site, valueCm })),
      });

      if (result.ok) {
        toast.success('Avaliação registrada.');
        setWeight('');
        setHeight('');
        setBodyFat('');
        setLeanMass('');
        setRestingHr('');
        setNotes('');
        setMeasurements({});
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
      title="Nova avaliação física"
      description="Preencha apenas o que foi efetivamente medido. Campos em branco não entram nos gráficos."
      size="lg"
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
            {isPending ? 'Salvando…' : 'Salvar avaliação'}
          </button>
        </>
      }
    >
      <div className="space-y-6">
        <div className="grid gap-5 sm:grid-cols-2">
          <Field label="Aluno" htmlFor="assess-student" required>
            <select
              id="assess-student"
              value={studentId}
              onChange={(e) => setStudentId(e.target.value)}
              className="hpe-select"
            >
              <option value="">Selecione…</option>
              {students.map((student) => (
                <option key={student.id} value={student.id}>
                  {student.full_name}
                </option>
              ))}
            </select>
          </Field>

          <Field label="Data da avaliação" htmlFor="assess-date" required>
            <input
              id="assess-date"
              type="date"
              value={assessedOn}
              max={todayISO()}
              onChange={(e) => setAssessedOn(e.target.value)}
              className="hpe-input"
            />
          </Field>
        </div>

        <fieldset>
          <legend className="hpe-label">Composição corporal</legend>
          <div className="grid gap-4 sm:grid-cols-3 lg:grid-cols-5">
            <Field label="Peso (kg)" htmlFor="assess-weight">
              <input
                id="assess-weight"
                inputMode="decimal"
                value={weight}
                onChange={(e) => setWeight(e.target.value)}
                className="hpe-input"
              />
            </Field>
            <Field label="Altura (cm)" htmlFor="assess-height">
              <input
                id="assess-height"
                inputMode="decimal"
                value={height}
                onChange={(e) => setHeight(e.target.value)}
                className="hpe-input"
              />
            </Field>
            <Field label="% Gordura" htmlFor="assess-fat">
              <input
                id="assess-fat"
                inputMode="decimal"
                value={bodyFat}
                onChange={(e) => setBodyFat(e.target.value)}
                className="hpe-input"
              />
            </Field>
            <Field label="Massa magra (kg)" htmlFor="assess-lean">
              <input
                id="assess-lean"
                inputMode="decimal"
                value={leanMass}
                onChange={(e) => setLeanMass(e.target.value)}
                className="hpe-input"
              />
            </Field>
            <Field label="FC repouso" htmlFor="assess-hr">
              <input
                id="assess-hr"
                inputMode="numeric"
                value={restingHr}
                onChange={(e) => setRestingHr(e.target.value)}
                className="hpe-input"
              />
            </Field>
          </div>
        </fieldset>

        <fieldset>
          <legend className="hpe-label">Medidas corporais (cm)</legend>
          <div className="grid gap-3 sm:grid-cols-3 lg:grid-cols-4">
            {MEASUREMENT_SITES.map((site) => (
              <label key={site} className="block">
                <span className="mb-1 block text-xs text-hpe-muted">{site}</span>
                <input
                  inputMode="decimal"
                  value={measurements[site] ?? ''}
                  onChange={(e) =>
                    setMeasurements((prev) => ({ ...prev, [site]: e.target.value }))
                  }
                  className="hpe-input"
                />
              </label>
            ))}
          </div>
        </fieldset>

        <Field label="Observações" htmlFor="assess-notes">
          <textarea
            id="assess-notes"
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
