'use client';

import { useState, useTransition } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  Ban,
  CalendarPlus,
  Check,
  CheckCheck,
  Clock,
  Trash2,
  UserX,
  X,
} from 'lucide-react';
import { Badge } from '@/components/ui/Badge';
import { Avatar } from '@/components/ui/Avatar';
import { EmptyState } from '@/components/ui/EmptyState';
import { Modal } from '@/components/ui/Modal';
import { Field } from '@/components/ui/Field';
import { useToast } from '@/components/ui/Toast';
import {
  adminSlots,
  cancelAppointment,
  createAppointment,
  createBlock,
  removeBlock,
  setAppointmentStatus,
} from './actions';
import type {
  AppointmentStatus,
  AvailableSlot,
  BlockedTime,
  Service,
} from '@/lib/supabase/database.types';
import { APPOINTMENT_STATUS } from '@/lib/labels';
import { cn, formatDate, formatDateTime, formatTime, todayISO } from '@/lib/utils';

export interface AgendaItem {
  id: string;
  starts_at: string;
  ends_at: string;
  status: AppointmentStatus;
  notes: string | null;
  student_notes: string | null;
  student: { id: string; full_name: string; photo_url: string | null } | null;
  service: { name: string } | null;
}

export function AgendaClient({
  items,
  blocks,
  services,
  students,
}: {
  items: AgendaItem[];
  blocks: BlockedTime[];
  services: Service[];
  students: { id: string; full_name: string }[];
}) {
  const router = useRouter();
  const toast = useToast();
  const [isPending, startTransition] = useTransition();
  const [newOpen, setNewOpen] = useState(false);
  const [blockOpen, setBlockOpen] = useState(false);

  function act(fn: () => Promise<{ ok: boolean; message?: string }>, success: string) {
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

  // Agrupa os atendimentos por dia, em ordem cronológica.
  const byDay = new Map<string, AgendaItem[]>();
  for (const item of items) {
    const key = new Intl.DateTimeFormat('en-CA', {
      timeZone: 'America/Sao_Paulo',
    }).format(new Date(item.starts_at));
    const list = byDay.get(key) ?? [];
    list.push(item);
    byDay.set(key, list);
  }

  return (
    <>
      <div className="mb-6 flex flex-wrap gap-2.5">
        <button
          type="button"
          onClick={() => setNewOpen(true)}
          className="hpe-btn-primary hpe-btn-sm"
        >
          <CalendarPlus className="h-4 w-4" />
          Novo atendimento
        </button>
        <button
          type="button"
          onClick={() => setBlockOpen(true)}
          className="hpe-btn-ghost hpe-btn-sm"
        >
          <Ban className="h-4 w-4" />
          Bloquear horário
        </button>
        <Link href="/admin/configuracoes" className="hpe-btn-subtle hpe-btn-sm">
          <Clock className="h-4 w-4" />
          Configurar disponibilidade
        </Link>
      </div>

      <div className="grid gap-6 xl:grid-cols-[1fr_minmax(0,320px)]">
        {/* ─── Atendimentos ────────────────────────────────────────────── */}
        <div className="space-y-6">
          {byDay.size === 0 ? (
            <EmptyState
              icon={CalendarPlus}
              title="Nenhum atendimento no período"
              description="Crie um atendimento manual ou aguarde os pedidos dos alunos."
            />
          ) : (
            Array.from(byDay.entries()).map(([day, dayItems]) => (
              <section key={day}>
                <h2 className="mb-3 flex items-baseline gap-3">
                  <span className="font-display text-base font-bold uppercase tracking-wide">
                    {formatDate(day, { weekday: 'long' })}
                  </span>
                  <span className="text-sm text-hpe-muted">
                    {formatDate(day, { day: '2-digit', month: 'long' })}
                  </span>
                  {day === todayISO() ? <Badge tone="orange">Hoje</Badge> : null}
                </h2>

                <ul className="space-y-2.5">
                  {dayItems.map((item) => {
                    const meta = APPOINTMENT_STATUS[item.status];
                    const closed =
                      item.status === 'cancelled' || item.status === 'completed';
                    return (
                      <li
                        key={item.id}
                        className={cn(
                          'hpe-card flex flex-col gap-4 p-4 sm:flex-row sm:items-center',
                          item.status === 'cancelled' && 'opacity-55',
                        )}
                      >
                        <div className="flex min-w-[5.5rem] flex-col">
                          <span className="font-display text-xl font-bold tabular-nums">
                            {formatTime(item.starts_at)}
                          </span>
                          <span className="text-xs text-hpe-muted">
                            até {formatTime(item.ends_at)}
                          </span>
                        </div>

                        <div className="flex min-w-0 flex-1 items-center gap-3">
                          <Avatar
                            name={item.student?.full_name ?? '—'}
                            src={item.student?.photo_url}
                            size={38}
                          />
                          <div className="min-w-0">
                            {item.student ? (
                              <Link
                                href={`/admin/alunos/${item.student.id}`}
                                className="block truncate font-medium hover:text-hpe-orange"
                              >
                                {item.student.full_name}
                              </Link>
                            ) : (
                              <span className="font-medium">—</span>
                            )}
                            <p className="truncate text-xs text-hpe-muted">
                              {item.service?.name ?? 'Atendimento'}
                              {item.student_notes ? ` · ${item.student_notes}` : ''}
                            </p>
                          </div>
                        </div>

                        <div className="flex flex-wrap items-center gap-2">
                          <Badge tone={meta.tone} dot>
                            {meta.label}
                          </Badge>

                          {!closed ? (
                            <>
                              {item.status === 'requested' ? (
                                <button
                                  type="button"
                                  disabled={isPending}
                                  onClick={() =>
                                    act(
                                      () => setAppointmentStatus(item.id, 'confirmed'),
                                      'Atendimento confirmado.',
                                    )
                                  }
                                  title="Confirmar"
                                  className="rounded-lg border border-sky-500/30 p-2 text-sky-300 transition-colors hover:bg-sky-500/10"
                                >
                                  <Check className="h-4 w-4" />
                                </button>
                              ) : null}

                              <button
                                type="button"
                                disabled={isPending}
                                onClick={() =>
                                  act(
                                    () => setAppointmentStatus(item.id, 'completed'),
                                    'Treino marcado como concluído.',
                                  )
                                }
                                title="Marcar como concluído"
                                className="rounded-lg border border-emerald-500/30 p-2 text-emerald-300 transition-colors hover:bg-emerald-500/10"
                              >
                                <CheckCheck className="h-4 w-4" />
                              </button>

                              <button
                                type="button"
                                disabled={isPending}
                                onClick={() =>
                                  act(
                                    () => setAppointmentStatus(item.id, 'no_show'),
                                    'Falta registrada.',
                                  )
                                }
                                title="Registrar falta"
                                className="rounded-lg border border-red-500/25 p-2 text-red-300 transition-colors hover:bg-red-500/10"
                              >
                                <UserX className="h-4 w-4" />
                              </button>

                              <button
                                type="button"
                                disabled={isPending}
                                onClick={() =>
                                  act(
                                    () => cancelAppointment(item.id),
                                    'Atendimento cancelado.',
                                  )
                                }
                                title="Cancelar"
                                className="rounded-lg border border-white/10 p-2 text-hpe-muted transition-colors hover:bg-white/5 hover:text-hpe-white"
                              >
                                <X className="h-4 w-4" />
                              </button>
                            </>
                          ) : null}
                        </div>
                      </li>
                    );
                  })}
                </ul>
              </section>
            ))
          )}
        </div>

        {/* ─── Bloqueios ───────────────────────────────────────────────── */}
        <aside>
          <h2 className="mb-3 font-display text-base font-bold uppercase tracking-wide">
            Bloqueios
          </h2>
          {blocks.length === 0 ? (
            <div className="hpe-card p-5 text-sm text-hpe-muted">
              Nenhum bloqueio ativo. Use bloqueios para feriados, férias ou
              compromissos pessoais.
            </div>
          ) : (
            <ul className="space-y-2.5">
              {blocks.map((block) => (
                <li
                  key={block.id}
                  className="hpe-card flex items-start gap-3 p-4 text-sm"
                >
                  <div className="min-w-0 flex-1">
                    <p className="font-medium">{block.reason ?? 'Horário bloqueado'}</p>
                    <p className="mt-1 text-xs text-hpe-muted">
                      {block.all_day
                        ? formatDate(block.starts_at)
                        : `${formatDateTime(block.starts_at)} → ${formatTime(block.ends_at)}`}
                    </p>
                  </div>
                  <button
                    type="button"
                    disabled={isPending}
                    onClick={() =>
                      act(() => removeBlock(block.id), 'Bloqueio removido.')
                    }
                    title="Remover bloqueio"
                    className="shrink-0 rounded-lg p-1.5 text-hpe-muted transition-colors hover:bg-white/5 hover:text-red-300"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </li>
              ))}
            </ul>
          )}
        </aside>
      </div>

      <NewAppointmentModal
        open={newOpen}
        onClose={() => setNewOpen(false)}
        services={services}
        students={students}
        onDone={() => {
          setNewOpen(false);
          router.refresh();
        }}
      />

      <NewBlockModal
        open={blockOpen}
        onClose={() => setBlockOpen(false)}
        onDone={() => {
          setBlockOpen(false);
          router.refresh();
        }}
      />
    </>
  );
}

// ─── Modal: atendimento manual ──────────────────────────────────────────────
function NewAppointmentModal({
  open,
  onClose,
  services,
  students,
  onDone,
}: {
  open: boolean;
  onClose: () => void;
  services: Service[];
  students: { id: string; full_name: string }[];
  onDone: () => void;
}) {
  const toast = useToast();
  const [isPending, startTransition] = useTransition();
  const [studentId, setStudentId] = useState('');
  const [serviceId, setServiceId] = useState(services[0]?.id ?? '');
  const [date, setDate] = useState(todayISO());
  const [slot, setSlot] = useState('');
  const [customTime, setCustomTime] = useState('');
  const [notes, setNotes] = useState('');
  const [slots, setSlots] = useState<AvailableSlot[]>([]);
  const [loading, setLoading] = useState(false);

  async function loadSlots(nextDate: string, nextService: string) {
    setLoading(true);
    setSlot('');
    const result = await adminSlots(nextDate, nextService || null);
    setSlots(result.ok ? (result.data ?? []) : []);
    setLoading(false);
  }

  function submit() {
    // O personal pode marcar fora da grade padrão: o horário digitado
    // prevalece sobre a lista de sugestões.
    const startsAt = customTime
      ? new Date(`${date}T${customTime}:00`).toISOString()
      : slot;

    if (!studentId) {
      toast.error('Selecione o aluno.');
      return;
    }
    if (!startsAt) {
      toast.error('Escolha um horário.');
      return;
    }

    startTransition(async () => {
      const result = await createAppointment({
        studentId,
        serviceId: serviceId || null,
        startsAt,
        notes: notes.trim() || null,
      });
      if (result.ok) {
        toast.success('Atendimento criado.');
        setStudentId('');
        setSlot('');
        setCustomTime('');
        setNotes('');
        onDone();
      } else {
        toast.error(result.message ?? 'Não foi possível criar o atendimento.');
      }
    });
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Novo atendimento"
      description="Criado já confirmado. O horário é validado contra conflitos no servidor."
      footer={
        <>
          <button type="button" onClick={onClose} className="hpe-btn-subtle">
            Cancelar
          </button>
          <button
            type="button"
            onClick={submit}
            disabled={isPending}
            className="hpe-btn-primary"
          >
            {isPending ? 'Criando…' : 'Criar atendimento'}
          </button>
        </>
      }
    >
      <div className="space-y-5">
        <Field label="Aluno" htmlFor="student" required>
          <select
            id="student"
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

        <Field label="Tipo de treinamento" htmlFor="service">
          <select
            id="service"
            value={serviceId}
            onChange={(e) => {
              setServiceId(e.target.value);
              void loadSlots(date, e.target.value);
            }}
            className="hpe-select"
          >
            <option value="">Sem tipo definido</option>
            {services.map((service) => (
              <option key={service.id} value={service.id}>
                {service.name} · {service.duration_minutes} min
              </option>
            ))}
          </select>
        </Field>

        <Field label="Data" htmlFor="date" required>
          <input
            id="date"
            type="date"
            value={date}
            min={todayISO()}
            onChange={(e) => {
              setDate(e.target.value);
              void loadSlots(e.target.value, serviceId);
            }}
            className="hpe-input"
          />
        </Field>

        <div>
          <p className="hpe-label">Horários livres</p>
          {loading ? (
            <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
              {Array.from({ length: 8 }).map((_, i) => (
                <div key={i} className="hpe-skeleton h-9" />
              ))}
            </div>
          ) : slots.length === 0 ? (
            <p className="text-sm text-hpe-muted">
              Nenhum horário livre nesta data pela grade padrão. Use o campo abaixo
              para marcar fora do horário habitual.
            </p>
          ) : (
            <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
              {slots.map((item) => (
                <button
                  key={item.slot_start}
                  type="button"
                  onClick={() => {
                    setSlot(item.slot_start);
                    setCustomTime('');
                  }}
                  className={cn(
                    'rounded-xl border px-2 py-2 text-sm font-medium tabular-nums transition-colors',
                    slot === item.slot_start
                      ? 'border-hpe-orange bg-hpe-orange text-hpe-black'
                      : 'border-white/10 hover:border-hpe-orange/50',
                  )}
                >
                  {formatTime(item.slot_start)}
                </button>
              ))}
            </div>
          )}
        </div>

        <Field
          label="Ou informe outro horário"
          htmlFor="custom-time"
          hint="Permite encaixes fora da grade. Conflitos continuam bloqueados."
        >
          <input
            id="custom-time"
            type="time"
            value={customTime}
            onChange={(e) => {
              setCustomTime(e.target.value);
              setSlot('');
            }}
            className="hpe-input"
          />
        </Field>

        <Field label="Observação" htmlFor="appointment-notes">
          <textarea
            id="appointment-notes"
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

// ─── Modal: bloqueio ────────────────────────────────────────────────────────
function NewBlockModal({
  open,
  onClose,
  onDone,
}: {
  open: boolean;
  onClose: () => void;
  onDone: () => void;
}) {
  const toast = useToast();
  const [isPending, startTransition] = useTransition();
  const [date, setDate] = useState(todayISO());
  const [endDate, setEndDate] = useState(todayISO());
  const [allDay, setAllDay] = useState(true);
  const [start, setStart] = useState('08:00');
  const [end, setEnd] = useState('12:00');
  const [reason, setReason] = useState('');

  function submit() {
    const startsAt = allDay
      ? new Date(`${date}T00:00:00`).toISOString()
      : new Date(`${date}T${start}:00`).toISOString();
    const endsAt = allDay
      ? new Date(`${endDate}T23:59:59`).toISOString()
      : new Date(`${date}T${end}:00`).toISOString();

    startTransition(async () => {
      const result = await createBlock({
        startsAt,
        endsAt,
        reason: reason.trim() || null,
        allDay,
      });
      if (result.ok) {
        toast.success('Bloqueio criado.');
        setReason('');
        onDone();
      } else {
        toast.error(result.message ?? 'Não foi possível criar o bloqueio.');
      }
    });
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Bloquear horário"
      description="Feriados, férias ou compromissos. Os horários bloqueados somem da agenda pública."
      size="sm"
      footer={
        <>
          <button type="button" onClick={onClose} className="hpe-btn-subtle">
            Cancelar
          </button>
          <button
            type="button"
            onClick={submit}
            disabled={isPending}
            className="hpe-btn-primary"
          >
            {isPending ? 'Salvando…' : 'Bloquear'}
          </button>
        </>
      }
    >
      <div className="space-y-5">
        <label className="flex cursor-pointer items-center gap-3">
          <input
            type="checkbox"
            checked={allDay}
            onChange={(e) => setAllDay(e.target.checked)}
            className="h-4 w-4 accent-hpe-orange"
          />
          <span className="text-sm">Dia(s) inteiro(s)</span>
        </label>

        <Field label={allDay ? 'De' : 'Data'} htmlFor="block-date" required>
          <input
            id="block-date"
            type="date"
            value={date}
            onChange={(e) => {
              setDate(e.target.value);
              if (e.target.value > endDate) setEndDate(e.target.value);
            }}
            className="hpe-input"
          />
        </Field>

        {allDay ? (
          <Field label="Até" htmlFor="block-end-date" required>
            <input
              id="block-end-date"
              type="date"
              value={endDate}
              min={date}
              onChange={(e) => setEndDate(e.target.value)}
              className="hpe-input"
            />
          </Field>
        ) : (
          <div className="grid grid-cols-2 gap-4">
            <Field label="Início" htmlFor="block-start" required>
              <input
                id="block-start"
                type="time"
                value={start}
                onChange={(e) => setStart(e.target.value)}
                className="hpe-input"
              />
            </Field>
            <Field label="Fim" htmlFor="block-finish" required>
              <input
                id="block-finish"
                type="time"
                value={end}
                onChange={(e) => setEnd(e.target.value)}
                className="hpe-input"
              />
            </Field>
          </div>
        )}

        <Field label="Motivo" htmlFor="block-reason">
          <input
            id="block-reason"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="Ex.: feriado, férias, consulta"
            className="hpe-input"
          />
        </Field>
      </div>
    </Modal>
  );
}
