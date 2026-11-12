'use client';

import { useTransition } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { CalendarPlus, X } from 'lucide-react';
import { Badge } from '@/components/ui/Badge';
import { EmptyState } from '@/components/ui/EmptyState';
import { useToast } from '@/components/ui/Toast';
import { cancelMyAppointment } from './actions';
import type { AppointmentStatus } from '@/lib/supabase/database.types';
import { APPOINTMENT_STATUS } from '@/lib/labels';
import { cn, formatDate, formatTime } from '@/lib/utils';

export interface StudentAppointment {
  id: string;
  starts_at: string;
  ends_at: string;
  status: AppointmentStatus;
  student_notes: string | null;
  service_name: string | null;
}

export function AppointmentsClient({
  upcoming,
  past,
  minHoursToCancel,
}: {
  upcoming: StudentAppointment[];
  past: StudentAppointment[];
  minHoursToCancel: number;
}) {
  const router = useRouter();
  const toast = useToast();
  const [isPending, startTransition] = useTransition();

  function cancel(id: string) {
    if (!confirm('Cancelar este treino?')) return;
    startTransition(async () => {
      const result = await cancelMyAppointment(id);
      if (result.ok) {
        toast.success('Treino cancelado.');
        router.refresh();
      } else {
        toast.error(result.message ?? 'Não foi possível cancelar.');
      }
    });
  }

  return (
    <>
      <section className="mb-8">
        <div className="mb-3 flex items-center justify-between gap-3">
          <h2 className="font-display text-base font-bold uppercase tracking-wide">
            Próximos treinos
          </h2>
          <Link href="/agendar" className="hpe-btn-primary hpe-btn-sm">
            <CalendarPlus className="h-4 w-4" />
            Agendar
          </Link>
        </div>

        {upcoming.length === 0 ? (
          <EmptyState
            icon={CalendarPlus}
            title="Nenhum treino agendado"
            description="Escolha um horário livre e garanta sua vaga."
            action={
              <Link href="/agendar" className="hpe-btn-primary hpe-btn-sm">
                Agendar treino
              </Link>
            }
          />
        ) : (
          <ul className="space-y-3">
            {upcoming.map((item) => {
              const meta = APPOINTMENT_STATUS[item.status];
              const hoursAhead =
                (new Date(item.starts_at).getTime() - Date.now()) / 3_600_000;
              const canCancel = hoursAhead >= minHoursToCancel;

              return (
                <li key={item.id} className="hpe-card flex flex-col gap-4 p-5 sm:flex-row sm:items-center">
                  <div className="flex min-w-[6rem] flex-col">
                    <span className="hpe-display text-2xl tabular-nums">
                      {formatTime(item.starts_at)}
                    </span>
                    <span className="text-xs text-hpe-muted">
                      até {formatTime(item.ends_at)}
                    </span>
                  </div>

                  <div className="min-w-0 flex-1">
                    <p className="font-medium capitalize">
                      {formatDate(item.starts_at, {
                        weekday: 'long',
                        day: '2-digit',
                        month: 'long',
                      })}
                    </p>
                    <p className="text-sm text-hpe-muted">
                      {item.service_name ?? 'Treino'}
                    </p>
                    {item.student_notes ? (
                      <p className="mt-1 text-xs text-white/40">{item.student_notes}</p>
                    ) : null}
                  </div>

                  <div className="flex items-center gap-3">
                    <Badge tone={meta.tone} dot>
                      {meta.label}
                    </Badge>
                    <button
                      type="button"
                      onClick={() => cancel(item.id)}
                      disabled={isPending || !canCancel}
                      title={
                        canCancel
                          ? 'Cancelar treino'
                          : `Cancelamentos exigem ${minHoursToCancel}h de antecedência. Fale com o personal.`
                      }
                      className={cn(
                        'rounded-lg border p-2 transition-colors',
                        canCancel
                          ? 'border-white/10 text-hpe-muted hover:text-red-300'
                          : 'border-white/5 text-white/15',
                      )}
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                </li>
              );
            })}
          </ul>
        )}

        <p className="mt-4 text-xs leading-relaxed text-white/35">
          Cancelamentos pela plataforma precisam de pelo menos{' '}
          <strong className="text-hpe-muted">{minHoursToCancel} horas</strong> de
          antecedência. Dentro desse prazo, fale direto com o Patrick.
        </p>
      </section>

      {past.length > 0 ? (
        <section>
          <h2 className="mb-3 font-display text-base font-bold uppercase tracking-wide">
            Histórico
          </h2>
          <div className="hpe-card overflow-hidden">
            <ul className="divide-y divide-white/[0.05]">
              {past.map((item) => {
                const meta = APPOINTMENT_STATUS[item.status];
                return (
                  <li key={item.id} className="flex items-center gap-4 px-5 py-3.5">
                    <span className="w-28 shrink-0 text-sm tabular-nums text-hpe-muted">
                      {formatDate(item.starts_at)}
                    </span>
                    <span className="w-16 shrink-0 text-sm tabular-nums">
                      {formatTime(item.starts_at)}
                    </span>
                    <span className="min-w-0 flex-1 truncate text-sm text-hpe-muted">
                      {item.service_name ?? 'Treino'}
                    </span>
                    <Badge tone={meta.tone}>{meta.label}</Badge>
                  </li>
                );
              })}
            </ul>
          </div>
        </section>
      ) : null}
    </>
  );
}
