'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { Save } from 'lucide-react';
import { Field, SubmitButton } from '@/components/ui/Field';
import { useToast } from '@/components/ui/Toast';
import { createStudent, updateStudent } from './actions';
import type { Student } from '@/lib/supabase/database.types';
import { CONTRACT_STATUS, TRAINING_LEVEL } from '@/lib/labels';
import { todayISO } from '@/lib/utils';

export function StudentForm({ student }: { student?: Student }) {
  const router = useRouter();
  const toast = useToast();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    setError(null);

    startTransition(async () => {
      const result = student
        ? await updateStudent(student.id, formData)
        : await createStudent(formData);

      if (!result.ok) {
        setError(result.message ?? 'Não foi possível salvar.');
        return;
      }

      toast.success(student ? 'Alterações salvas.' : 'Aluno cadastrado.');
      router.push(
        student ? `/admin/alunos/${student.id}` : `/admin/alunos/${result.data?.id}`,
      );
      router.refresh();
    });
  }

  return (
    <form onSubmit={onSubmit} className="space-y-8">
      {/* ─── Dados pessoais ────────────────────────────────────────────── */}
      <fieldset className="hpe-card p-5 sm:p-6">
        <legend className="hpe-display px-2 text-base">Dados pessoais</legend>
        <div className="mt-5 grid gap-5 sm:grid-cols-2">
          <Field label="Nome completo" htmlFor="full_name" required className="sm:col-span-2">
            <input
              id="full_name"
              name="full_name"
              required
              minLength={3}
              defaultValue={student?.full_name}
              className="hpe-input"
            />
          </Field>

          <Field
            label="E-mail"
            htmlFor="email"
            hint="Usado para enviar o convite de acesso à área do aluno."
          >
            <input
              id="email"
              name="email"
              type="email"
              defaultValue={student?.email ?? ''}
              className="hpe-input"
            />
          </Field>

          <Field label="Telefone / WhatsApp" htmlFor="phone">
            <input
              id="phone"
              name="phone"
              inputMode="tel"
              placeholder="(31) 99999-9999"
              defaultValue={student?.phone ?? ''}
              className="hpe-input"
            />
          </Field>

          <Field label="Data de nascimento" htmlFor="birth_date">
            <input
              id="birth_date"
              name="birth_date"
              type="date"
              defaultValue={student?.birth_date ?? ''}
              className="hpe-input"
            />
          </Field>

          <Field label="CPF" htmlFor="cpf" hint="Opcional.">
            <input
              id="cpf"
              name="cpf"
              inputMode="numeric"
              defaultValue={student?.cpf ?? ''}
              className="hpe-input"
            />
          </Field>

          <Field label="Contato de emergência" htmlFor="emergency_contact_name">
            <input
              id="emergency_contact_name"
              name="emergency_contact_name"
              defaultValue={student?.emergency_contact_name ?? ''}
              className="hpe-input"
            />
          </Field>

          <Field label="Telefone de emergência" htmlFor="emergency_contact_phone">
            <input
              id="emergency_contact_phone"
              name="emergency_contact_phone"
              inputMode="tel"
              defaultValue={student?.emergency_contact_phone ?? ''}
              className="hpe-input"
            />
          </Field>
        </div>
      </fieldset>

      {/* ─── Treinamento ───────────────────────────────────────────────── */}
      <fieldset className="hpe-card p-5 sm:p-6">
        <legend className="hpe-display px-2 text-base">Treinamento</legend>
        <div className="mt-5 grid gap-5 sm:grid-cols-2">
          <Field label="Objetivo principal" htmlFor="main_goal" className="sm:col-span-2">
            <input
              id="main_goal"
              name="main_goal"
              placeholder="Ex.: ganho de massa muscular"
              defaultValue={student?.main_goal ?? ''}
              className="hpe-input"
            />
          </Field>

          <Field label="Nível de treinamento" htmlFor="training_level" required>
            <select
              id="training_level"
              name="training_level"
              defaultValue={student?.training_level ?? 'beginner'}
              className="hpe-select"
            >
              {Object.entries(TRAINING_LEVEL).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
          </Field>

          <Field label="Data de entrada" htmlFor="joined_at" required>
            <input
              id="joined_at"
              name="joined_at"
              type="date"
              required
              defaultValue={student?.joined_at ?? todayISO()}
              className="hpe-input"
            />
          </Field>
        </div>
      </fieldset>

      {/* ─── Contrato ──────────────────────────────────────────────────── */}
      <fieldset className="hpe-card p-5 sm:p-6">
        <legend className="hpe-display px-2 text-base">Contrato</legend>
        <div className="mt-5 grid gap-5 sm:grid-cols-2">
          <Field label="Plano contratado" htmlFor="plan_name">
            <input
              id="plan_name"
              name="plan_name"
              placeholder="Ex.: 3x por semana"
              defaultValue={student?.plan_name ?? ''}
              className="hpe-input"
            />
          </Field>

          <Field label="Valor mensal (R$)" htmlFor="monthly_fee">
            <input
              id="monthly_fee"
              name="monthly_fee"
              inputMode="decimal"
              placeholder="0,00"
              defaultValue={student?.monthly_fee ?? ''}
              className="hpe-input"
            />
          </Field>

          <Field label="Dia de vencimento" htmlFor="due_day" hint="De 1 a 31.">
            <input
              id="due_day"
              name="due_day"
              type="number"
              min={1}
              max={31}
              defaultValue={student?.due_day ?? ''}
              className="hpe-input"
            />
          </Field>

          <Field label="Situação do contrato" htmlFor="contract_status" required>
            <select
              id="contract_status"
              name="contract_status"
              defaultValue={student?.contract_status ?? 'active'}
              className="hpe-select"
            >
              {Object.entries(CONTRACT_STATUS).map(([value, meta]) => (
                <option key={value} value={value}>
                  {meta.label}
                </option>
              ))}
            </select>
          </Field>

          <Field
            label="Observações"
            htmlFor="notes"
            className="sm:col-span-2"
            hint="Anotações privadas do personal — o aluno não vê este campo."
          >
            <textarea
              id="notes"
              name="notes"
              rows={4}
              defaultValue={student?.notes ?? ''}
              className="hpe-textarea"
            />
          </Field>
        </div>
      </fieldset>

      {/* ─── Consentimentos (LGPD) ─────────────────────────────────────── */}
      <fieldset className="hpe-card p-5 sm:p-6">
        <legend className="hpe-display px-2 text-base">Consentimentos</legend>
        <p className="mt-3 text-sm leading-relaxed text-hpe-muted">
          Marque apenas o que o aluno autorizou de fato. O registro fica gravado com
          data e pode ser revogado a qualquer momento.
        </p>
        <div className="mt-5 space-y-4">
          <label className="flex cursor-pointer items-start gap-3">
            <input
              type="checkbox"
              name="lgpd_consent"
              defaultChecked={Boolean(student?.lgpd_consent_at)}
              className="mt-0.5 h-4 w-4 shrink-0 accent-hpe-orange"
            />
            <span className="text-sm leading-relaxed text-hpe-muted">
              O aluno autorizou o tratamento dos seus dados pessoais e de saúde para
              fins de acompanhamento do treinamento.
            </span>
          </label>

          <label className="flex cursor-pointer items-start gap-3">
            <input
              type="checkbox"
              name="photo_consent"
              defaultChecked={student?.photo_consent ?? false}
              className="mt-0.5 h-4 w-4 shrink-0 accent-hpe-orange"
            />
            <span className="text-sm leading-relaxed text-hpe-muted">
              O aluno autorizou o registro de fotografias de evolução física
              (armazenadas em acesso privado).
            </span>
          </label>
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
        <SubmitButton pending={isPending}>
          <Save className="h-4 w-4" />
          {student ? 'Salvar alterações' : 'Cadastrar aluno'}
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
