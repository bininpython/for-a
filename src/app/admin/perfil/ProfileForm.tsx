'use client';

import { useState, useTransition } from 'react';
import { KeyRound, Save } from 'lucide-react';
import { Field, SubmitButton } from '@/components/ui/Field';
import { useToast } from '@/components/ui/Toast';
import { ImageUploader } from '@/components/upload/ImageUploader';
import { changePassword, updatePersonalProfile } from './actions';
import type { PersonalSettings } from '@/lib/supabase/database.types';

const toLines = (values: string[] | undefined) => (values ?? []).join('\n');
const fromLines = (value: string) =>
  value
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean);

export function ProfileForm({ settings }: { settings: PersonalSettings | null }) {
  const toast = useToast();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const [professionalName, setProfessionalName] = useState(
    settings?.professional_name ?? 'Patrick Personal',
  );
  const [headline, setHeadline] = useState(settings?.headline ?? '');
  const [bio, setBio] = useState(settings?.bio ?? '');
  const [methodology, setMethodology] = useState(settings?.methodology ?? '');
  const [experience, setExperience] = useState(settings?.experience ?? '');
  const [philosophy, setPhilosophy] = useState(settings?.philosophy ?? '');
  const [specialties, setSpecialties] = useState(toLines(settings?.specialties));
  const [certifications, setCertifications] = useState(toLines(settings?.certifications));
  const [differentials, setDifferentials] = useState(toLines(settings?.differentials));
  const [photoUrl, setPhotoUrl] = useState(settings?.photo_url ?? '');
  const [logoUrl, setLogoUrl] = useState(settings?.logo_url ?? '');
  const [whatsapp, setWhatsapp] = useState(settings?.whatsapp ?? '');
  const [instagram, setInstagram] = useState(settings?.instagram ?? '');
  const [publicEmail, setPublicEmail] = useState(settings?.public_email ?? '');
  const [gymName, setGymName] = useState(settings?.gym_name ?? 'ALP FIT');
  const [gymAddress, setGymAddress] = useState(settings?.gym_address ?? '');
  const [gymCity, setGymCity] = useState(settings?.gym_city ?? 'Coronel Fabriciano/MG');
  const [gymMapsUrl, setGymMapsUrl] = useState(settings?.gym_maps_url ?? '');
  const [attendanceNotes, setAttendanceNotes] = useState(settings?.attendance_notes ?? '');

  const [password, setPassword] = useState('');
  const [confirmation, setConfirmation] = useState('');

  function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);

    startTransition(async () => {
      const result = await updatePersonalProfile({
        professionalName,
        headline: headline || null,
        bio: bio || null,
        methodology: methodology || null,
        experience: experience || null,
        philosophy: philosophy || null,
        specialties: fromLines(specialties),
        certifications: fromLines(certifications),
        differentials: fromLines(differentials),
        photoUrl: photoUrl || null,
        logoUrl: logoUrl || null,
        whatsapp: whatsapp || null,
        instagram: instagram || null,
        publicEmail: publicEmail || null,
        gymName,
        gymAddress: gymAddress || null,
        gymCity,
        gymMapsUrl: gymMapsUrl || null,
        attendanceNotes: attendanceNotes || null,
      });

      if (result.ok) {
        toast.success('Perfil atualizado. As mudanças já aparecem no site.');
      } else {
        setError(result.message ?? 'Não foi possível salvar.');
      }
    });
  }

  function submitPassword() {
    if (password !== confirmation) {
      toast.error('As senhas não conferem.');
      return;
    }
    startTransition(async () => {
      const result = await changePassword(password);
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
      <form onSubmit={onSubmit} className="space-y-8">
        <p className="rounded-xl border border-hpe-orange/25 bg-hpe-orange/[0.05] px-4 py-3 text-sm leading-relaxed text-hpe-muted">
          Tudo o que você escreve aqui aparece no site institucional. Os campos nascem
          vazios de propósito: nenhuma biografia, certificação ou experiência é gerada
          automaticamente pela plataforma.
        </p>

        {/* ─── Identidade ───────────────────────────────────────────────── */}
        <fieldset className="hpe-card p-5 sm:p-6">
          <legend className="hpe-display px-2 text-base">Identidade</legend>
          <div className="mt-5 grid gap-5 sm:grid-cols-2">
            <Field label="Nome profissional" htmlFor="pro-name" required>
              <input
                id="pro-name"
                value={professionalName}
                onChange={(e) => setProfessionalName(e.target.value)}
                required
                className="hpe-input"
              />
            </Field>

            <Field
              label="Frase de apresentação"
              htmlFor="pro-headline"
              hint="Uma linha, exibida logo abaixo do nome."
            >
              <input
                id="pro-headline"
                value={headline}
                onChange={(e) => setHeadline(e.target.value)}
                className="hpe-input"
              />
            </Field>

            <ImageUploader
              label="Fotografia profissional"
              bucket="public-assets"
              folder="personal"
              value={photoUrl}
              onChange={setPhotoUrl}
              hint="Formato retrato funciona melhor na seção “O Personal”."
            />

            <ImageUploader
              label="Logo HPE"
              bucket="public-assets"
              folder="brand"
              value={logoUrl}
              onChange={setLogoUrl}
              hint="Substitui a logo padrão no cabeçalho e no rodapé."
            />
          </div>
        </fieldset>

        {/* ─── Sobre o trabalho ─────────────────────────────────────────── */}
        <fieldset className="hpe-card p-5 sm:p-6">
          <legend className="hpe-display px-2 text-base">Sobre o seu trabalho</legend>
          <div className="mt-5 space-y-5">
            <Field
              label="Biografia"
              htmlFor="pro-bio"
              hint="Separe parágrafos com uma linha em branco."
            >
              <textarea
                id="pro-bio"
                rows={6}
                value={bio}
                onChange={(e) => setBio(e.target.value)}
                className="hpe-textarea"
              />
            </Field>

            <div className="grid gap-5 sm:grid-cols-2">
              <Field label="Metodologia de treinamento" htmlFor="pro-method">
                <textarea
                  id="pro-method"
                  rows={4}
                  value={methodology}
                  onChange={(e) => setMethodology(e.target.value)}
                  className="hpe-textarea"
                />
              </Field>

              <Field label="Experiência profissional" htmlFor="pro-exp">
                <textarea
                  id="pro-exp"
                  rows={4}
                  value={experience}
                  onChange={(e) => setExperience(e.target.value)}
                  className="hpe-textarea"
                />
              </Field>
            </div>

            <Field label="Filosofia de trabalho" htmlFor="pro-philosophy">
              <textarea
                id="pro-philosophy"
                rows={4}
                value={philosophy}
                onChange={(e) => setPhilosophy(e.target.value)}
                className="hpe-textarea"
              />
            </Field>

            <div className="grid gap-5 sm:grid-cols-3">
              <Field label="Especialidades" htmlFor="pro-spec" hint="Uma por linha.">
                <textarea
                  id="pro-spec"
                  rows={5}
                  value={specialties}
                  onChange={(e) => setSpecialties(e.target.value)}
                  className="hpe-textarea"
                />
              </Field>

              <Field label="Certificações" htmlFor="pro-cert" hint="Uma por linha.">
                <textarea
                  id="pro-cert"
                  rows={5}
                  value={certifications}
                  onChange={(e) => setCertifications(e.target.value)}
                  className="hpe-textarea"
                />
              </Field>

              <Field label="Diferenciais" htmlFor="pro-diff" hint="Um por linha.">
                <textarea
                  id="pro-diff"
                  rows={5}
                  value={differentials}
                  onChange={(e) => setDifferentials(e.target.value)}
                  className="hpe-textarea"
                />
              </Field>
            </div>
          </div>
        </fieldset>

        {/* ─── Contato e local ──────────────────────────────────────────── */}
        <fieldset className="hpe-card p-5 sm:p-6">
          <legend className="hpe-display px-2 text-base">Contato e local</legend>
          <div className="mt-5 grid gap-5 sm:grid-cols-2">
            <Field label="WhatsApp" htmlFor="pro-wa" hint="Com DDD.">
              <input
                id="pro-wa"
                inputMode="tel"
                value={whatsapp}
                onChange={(e) => setWhatsapp(e.target.value)}
                placeholder="(31) 99999-9999"
                className="hpe-input"
              />
            </Field>

            <Field label="Instagram" htmlFor="pro-ig" hint="Apenas o usuário, sem @.">
              <input
                id="pro-ig"
                value={instagram}
                onChange={(e) => setInstagram(e.target.value)}
                className="hpe-input"
              />
            </Field>

            <Field label="E-mail público" htmlFor="pro-email">
              <input
                id="pro-email"
                type="email"
                value={publicEmail}
                onChange={(e) => setPublicEmail(e.target.value)}
                className="hpe-input"
              />
            </Field>

            <Field label="Academia" htmlFor="pro-gym" required>
              <input
                id="pro-gym"
                value={gymName}
                onChange={(e) => setGymName(e.target.value)}
                required
                className="hpe-input"
              />
            </Field>

            <Field label="Cidade" htmlFor="pro-city" required>
              <input
                id="pro-city"
                value={gymCity}
                onChange={(e) => setGymCity(e.target.value)}
                required
                className="hpe-input"
              />
            </Field>

            <Field label="Endereço completo" htmlFor="pro-address">
              <input
                id="pro-address"
                value={gymAddress}
                onChange={(e) => setGymAddress(e.target.value)}
                placeholder="Rua, número, bairro"
                className="hpe-input"
              />
            </Field>

            <Field
              label="Link do Google Maps"
              htmlFor="pro-maps"
              hint="Opcional. Sem link, o mapa busca pelo endereço."
              className="sm:col-span-2"
            >
              <input
                id="pro-maps"
                type="url"
                value={gymMapsUrl}
                onChange={(e) => setGymMapsUrl(e.target.value)}
                placeholder="https://maps.app.goo.gl/…"
                className="hpe-input"
              />
            </Field>

            <Field
              label="Informações de atendimento"
              htmlFor="pro-notes"
              className="sm:col-span-2"
            >
              <textarea
                id="pro-notes"
                rows={3}
                value={attendanceNotes}
                onChange={(e) => setAttendanceNotes(e.target.value)}
                placeholder="Ex.: atendimento na área de musculação, procure na recepção."
                className="hpe-textarea"
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

        <SubmitButton pending={isPending}>
          <Save className="h-4 w-4" />
          Salvar perfil
        </SubmitButton>
      </form>

      {/* ─── Senha ──────────────────────────────────────────────────────── */}
      <section className="hpe-card p-5 sm:p-6">
        <h2 className="hpe-display text-base">Alterar senha</h2>
        <div className="mt-5 grid gap-5 sm:grid-cols-2">
          <Field label="Nova senha" htmlFor="pro-pass" hint="Mínimo de 8 caracteres.">
            <input
              id="pro-pass"
              type="password"
              autoComplete="new-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="hpe-input"
            />
          </Field>
          <Field label="Confirmar nova senha" htmlFor="pro-pass2">
            <input
              id="pro-pass2"
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
