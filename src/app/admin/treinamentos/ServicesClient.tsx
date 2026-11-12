'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { Dumbbell, Pencil, Plus, Trash2 } from 'lucide-react';
import { Badge } from '@/components/ui/Badge';
import { Modal } from '@/components/ui/Modal';
import { Field } from '@/components/ui/Field';
import { EmptyState } from '@/components/ui/EmptyState';
import { useToast } from '@/components/ui/Toast';
import { deleteService, upsertService } from '../configuracoes/actions';
import type { Service } from '@/lib/supabase/database.types';

export function ServicesClient({ services }: { services: Service[] }) {
  const router = useRouter();
  const toast = useToast();
  const [isPending, startTransition] = useTransition();
  const [editing, setEditing] = useState<Service | 'new' | null>(null);

  return (
    <>
      <div className="mb-6">
        <button
          type="button"
          onClick={() => setEditing('new')}
          className="hpe-btn-primary hpe-btn-sm"
        >
          <Plus className="h-4 w-4" />
          Novo tipo de treinamento
        </button>
      </div>

      {services.length === 0 ? (
        <EmptyState
          icon={Dumbbell}
          title="Nenhum tipo de treinamento cadastrado"
          description="Os tipos aparecem no site e na tela de agendamento."
        />
      ) : (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {services.map((service) => (
            <article key={service.id} className="hpe-card flex flex-col p-5">
              <div className="flex items-start justify-between gap-3">
                <h2 className="font-display text-base font-bold uppercase leading-tight tracking-wide">
                  {service.name}
                </h2>
                <Badge tone={service.bookable ? 'green' : 'gray'}>
                  {service.bookable ? 'Agendável' : 'Sob consulta'}
                </Badge>
              </div>

              {service.description ? (
                <p className="mt-3 flex-1 text-sm leading-relaxed text-hpe-muted">
                  {service.description}
                </p>
              ) : (
                <div className="flex-1" />
              )}

              {service.benefits.length ? (
                <ul className="mt-4 space-y-1.5">
                  {service.benefits.map((benefit) => (
                    <li key={benefit} className="flex gap-2 text-xs text-hpe-muted">
                      <span className="mt-[0.4rem] h-1 w-1 shrink-0 rounded-full bg-hpe-orange" />
                      {benefit}
                    </li>
                  ))}
                </ul>
              ) : null}

              <div className="mt-5 flex items-center justify-between gap-3 border-t border-white/[0.07] pt-4">
                <span className="text-xs text-hpe-muted">
                  {service.duration_minutes} min
                </span>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setEditing(service)}
                    title="Editar"
                    className="rounded-lg border border-white/10 p-2 text-hpe-muted transition-colors hover:text-hpe-white"
                  >
                    <Pencil className="h-4 w-4" />
                  </button>
                  <button
                    type="button"
                    disabled={isPending}
                    onClick={() => {
                      if (!confirm(`Excluir “${service.name}”?`)) return;
                      startTransition(async () => {
                        const result = await deleteService(service.id);
                        if (result.ok) {
                          toast.success('Serviço excluído.');
                          router.refresh();
                        } else {
                          toast.error(result.message ?? 'Não foi possível excluir.');
                        }
                      });
                    }}
                    title="Excluir"
                    className="rounded-lg border border-white/10 p-2 text-hpe-muted transition-colors hover:text-red-300"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>
            </article>
          ))}
        </div>
      )}

      <ServiceModal
        state={editing}
        onClose={() => setEditing(null)}
        onSaved={() => {
          setEditing(null);
          router.refresh();
        }}
      />
    </>
  );
}

function ServiceModal({
  state,
  onClose,
  onSaved,
}: {
  state: Service | 'new' | null;
  onClose: () => void;
  onSaved: () => void;
}) {
  const toast = useToast();
  const [isPending, startTransition] = useTransition();
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [benefits, setBenefits] = useState('');
  const [duration, setDuration] = useState('60');
  const [bookable, setBookable] = useState(true);
  const [initialized, setInitialized] = useState<string | null>(null);

  const key = state === null ? null : state === 'new' ? 'new' : state.id;
  if (state && initialized !== key) {
    const service = state === 'new' ? null : state;
    setName(service?.name ?? '');
    setDescription(service?.description ?? '');
    setBenefits((service?.benefits ?? []).join('\n'));
    setDuration(String(service?.duration_minutes ?? 60));
    setBookable(service?.bookable ?? true);
    setInitialized(key);
  }
  if (!state && initialized !== null) setInitialized(null);

  function save() {
    startTransition(async () => {
      const result = await upsertService({
        id: state && state !== 'new' ? state.id : undefined,
        name,
        description: description.trim() || null,
        benefits: benefits
          .split('\n')
          .map((line) => line.trim())
          .filter(Boolean),
        durationMinutes: duration,
        bookable,
      });

      if (result.ok) {
        toast.success('Serviço salvo.');
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
      title={state === 'new' ? 'Novo tipo de treinamento' : 'Editar treinamento'}
      footer={
        <>
          <button type="button" onClick={onClose} className="hpe-btn-subtle">
            Cancelar
          </button>
          <button
            type="button"
            onClick={save}
            disabled={isPending || name.trim().length < 2}
            className="hpe-btn-primary"
          >
            {isPending ? 'Salvando…' : 'Salvar'}
          </button>
        </>
      }
    >
      <div className="space-y-5">
        <Field label="Nome" htmlFor="svc-name" required>
          <input
            id="svc-name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="hpe-input"
          />
        </Field>

        <Field label="Descrição" htmlFor="svc-desc">
          <textarea
            id="svc-desc"
            rows={4}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            className="hpe-textarea"
          />
        </Field>

        <Field
          label="Benefícios"
          htmlFor="svc-benefits"
          hint="Um por linha. Aparecem no card do site."
        >
          <textarea
            id="svc-benefits"
            rows={4}
            value={benefits}
            onChange={(e) => setBenefits(e.target.value)}
            className="hpe-textarea"
          />
        </Field>

        <div className="grid gap-5 sm:grid-cols-2">
          <Field label="Duração (min)" htmlFor="svc-duration" required>
            <input
              id="svc-duration"
              type="number"
              min={15}
              max={240}
              step={5}
              value={duration}
              onChange={(e) => setDuration(e.target.value)}
              className="hpe-input"
            />
          </Field>

          <label className="flex cursor-pointer items-center gap-3 self-end pb-3">
            <input
              type="checkbox"
              checked={bookable}
              onChange={(e) => setBookable(e.target.checked)}
              className="h-4 w-4 accent-hpe-orange"
            />
            <span className="text-sm">Disponível para agendamento online</span>
          </label>
        </div>
      </div>
    </Modal>
  );
}
