'use client';

import { useState, useTransition } from 'react';
import { KeyRound, Save } from 'lucide-react';
import { Field, SubmitButton } from '@/components/ui/Field';
import { useToast } from '@/components/ui/Toast';
import { ImageUploader } from '@/components/upload/ImageUploader';
import { changeMyPassword, updateMyProfile } from './actions';
import type { Student } from '@/lib/supabase/database.types';
import { TRAINING_LEVEL } from '@/lib/labels';
import { formatCurrency, formatDate } from '@/lib/utils';

export function StudentProfileForm({
  student,
  email,
}: {
  student: Student;
  email: string | null;
}) {
  const toast = useToast();
  const [isPending, startTransition] = useTransition();

  const [phone, setPhone] = useState(student.phone ?? '');
  const [photoUrl, setPhotoUrl] = useState(student.photo_url ?? '');
  const [emergencyName, setEmergencyName] = useState(
    student.emergency_contact_name ?? '',
  );
  const [emergencyPhone, setEmergencyPhone] = useState(
    student.emergency_contact_phone ?? '',
  );
  const [photoConsent, setPhotoConsent] = useState(student.photo_consent);

  const [password, setPassword] = useState('');
  const [confirmation, setConfirmation] = useState('');

  function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    startTransition(async () => {
      const result = await updateMyProfile({
        phone: phone || null,
        photoUrl: photoUrl || null,
        emergencyContactName: emergencyName || null,
        emergencyContactPhone: emergencyPhone || null,
        photoConsent,
      });
      if (result.ok) {
        toast.success('Perfil atualizado.');
      } else {
        toast.error(result.message ?? 'Não foi possível salvar.');
      }
    });
  }

  function submitPassword() {
    if (password !== confirmation) {
      toast.error('As senhas não conferem.');
      return;
    }
    startTransition(async () => {
      const result = await changeMyPassword(password);
      if (result.ok) {
        toast.success(result.message ?? 'Senha alterada.');
        setPassword('');
        setConfirmation('');
      } else {
        toast.error(result.message ?? 'Não foi possível alterar a senha.');
      }
    });
  }

  return (
    <div className="space-y-8">
      <form onSubmit={onSubmit} className="space-y-6">
        <fieldset className="hpe-card p-5 sm:p-6">
          <legend className="hpe-display px-2 text-base">Meus dados</legend>
          <div className="mt-5 grid gap-5 sm:grid-cols-2">
            <ImageUploader
              label="Minha foto"
              bucket="avatars"
              folder={student.profile_id ?? 'alunos'}
              value={photoUrl}
              onChange={setPhotoUrl}
              className="sm:col-span-2"
            />

            <Field label="Telefone / WhatsApp" htmlFor="my-phone">
              <input
                id="my-phone"
                inputMode="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="hpe-input"
              />
            </Field>

            <Field
              label="E-mail"
              htmlFor="my-email"
              hint="Para alterar o e-mail, fale com o Patrick."
            >
              <input
                id="my-email"
                value={email ?? student.email ?? ''}
                disabled
                className="hpe-input"
              />
            </Field>

            <Field label="Contato de emergência" htmlFor="my-emergency">
              <input
                id="my-emergency"
                value={emergencyName}
                onChange={(e) => setEmergencyName(e.target.value)}
                className="hpe-input"
              />
            </Field>

            <Field label="Telefone de emergência" htmlFor="my-emergency-phone">
              <input
                id="my-emergency-phone"
                inputMode="tel"
                value={emergencyPhone}
                onChange={(e) => setEmergencyPhone(e.target.value)}
                className="hpe-input"
              />
            </Field>
          </div>
        </fieldset>

        <fieldset className="hpe-card p-5 sm:p-6">
          <legend className="hpe-display px-2 text-base">Privacidade</legend>
          <label className="mt-5 flex cursor-pointer items-start gap-3">
            <input
              type="checkbox"
              checked={photoConsent}
              onChange={(e) => setPhotoConsent(e.target.checked)}
              className="mt-0.5 h-4 w-4 shrink-0 accent-hpe-orange"
            />
            <span className="text-sm leading-relaxed text-hpe-muted">
              Autorizo o registro de fotografias de evolução física. As imagens ficam
              em armazenamento privado, visíveis apenas para mim e para o Patrick.
              Posso revogar esta autorização a qualquer momento desmarcando esta
              opção.
            </span>
          </label>
        </fieldset>

        <SubmitButton pending={isPending}>
          <Save className="h-4 w-4" />
          Salvar alterações
        </SubmitButton>
      </form>

      {/* ─── Dados sob responsabilidade do personal ─────────────────────── */}
      <section className="hpe-card p-5 sm:p-6">
        <h2 className="hpe-display text-base">Meu plano</h2>
        <p className="mt-1 text-xs text-hpe-muted">
          Estes dados são definidos pelo Patrick. Para alterá-los, fale com ele.
        </p>
        <dl className="mt-5 space-y-3.5 text-sm">
          <Row label="Objetivo" value={student.main_goal ?? '—'} />
          <Row label="Nível" value={TRAINING_LEVEL[student.training_level]} />
          <Row label="Plano" value={student.plan_name ?? '—'} />
          <Row label="Mensalidade" value={formatCurrency(student.monthly_fee)} />
          <Row label="Aluno desde" value={formatDate(student.joined_at)} />
        </dl>
      </section>

      {/* ─── Senha ──────────────────────────────────────────────────────── */}
      <section className="hpe-card p-5 sm:p-6">
        <h2 className="hpe-display text-base">Alterar senha</h2>
        <div className="mt-5 grid gap-5 sm:grid-cols-2">
          <Field label="Nova senha" htmlFor="my-pass" hint="Mínimo de 8 caracteres.">
            <input
              id="my-pass"
              type="password"
              autoComplete="new-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="hpe-input"
            />
          </Field>
          <Field label="Confirmar nova senha" htmlFor="my-pass2">
            <input
              id="my-pass2"
              type="password"
              autoComplete="new-password"
              value={confirmation}
              onChange={(e) => setConfirmation(e.target.value)}
              className="hpe-input"
            />
          </Field>
        </div>
        <button
          type="button"
          onClick={submitPassword}
          disabled={isPending || password.length < 8}
          className="hpe-btn-ghost mt-5"
        >
          <KeyRound className="h-4 w-4" />
          Alterar senha
        </button>
      </section>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-baseline justify-between gap-4 border-b border-white/[0.05] pb-3 last:border-0 last:pb-0">
      <dt className="text-xs font-semibold uppercase tracking-wider text-hpe-muted">
        {label}
      </dt>
      <dd className="text-right">{value}</dd>
    </div>
  );
}
