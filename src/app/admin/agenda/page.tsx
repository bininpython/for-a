import Link from 'next/link';
import { PageHeader } from '@/components/dashboard/PageHeader';
import { AgendaClient, type AgendaItem } from './AgendaClient';
import { createClient } from '@/lib/supabase/server';
import { addDaysISO, cn, todayISO } from '@/lib/utils';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Agenda' };

const RANGES = [
  { value: 'dia', label: 'Dia', days: 1 },
  { value: 'semana', label: 'Semana', days: 7 },
  { value: 'mes', label: 'Mês', days: 31 },
] as const;

export default async function AgendaPage({
  searchParams,
}: {
  searchParams: { visao?: string; de?: string };
}) {
  const supabase = createClient();
  const range = RANGES.find((r) => r.value === searchParams.visao) ?? RANGES[1];
  const from = searchParams.de ?? todayISO();
  const to = addDaysISO(from, range.days);

  const [appointments, blocks, services, students] = await Promise.all([
    supabase
      .from('appointments')
      .select(
        'id, starts_at, ends_at, status, notes, student_notes, students(id, full_name, photo_url), services(name)',
      )
      .gte('starts_at', `${from}T00:00:00-03:00`)
      .lt('starts_at', `${to}T00:00:00-03:00`)
      .order('starts_at'),
    supabase
      .from('blocked_times')
      .select('*')
      .gte('ends_at', new Date().toISOString())
      .order('starts_at')
      .limit(30),
    supabase.from('services').select('*').order('sort_order'),
    supabase
      .from('students')
      .select('id, full_name')
      .in('contract_status', ['active', 'paused'])
      .order('full_name'),
  ]);

  const items: AgendaItem[] = (appointments.data ?? []).map((row) => ({
    id: row.id,
    starts_at: row.starts_at,
    ends_at: row.ends_at,
    status: row.status,
    notes: row.notes,
    student_notes: row.student_notes,
    student: (row.students as unknown as AgendaItem['student']) ?? null,
    service: (row.services as unknown as AgendaItem['service']) ?? null,
  }));

  return (
    <>
      <PageHeader
        title="Agenda"
        description="Atendimentos confirmados, pedidos pendentes e bloqueios."
        actions={
          <nav className="flex gap-2">
            {RANGES.map((item) => (
              <Link
                key={item.value}
                href={{ pathname: '/admin/agenda', query: { visao: item.value, de: from } }}
                className={cn(
                  'rounded-xl border px-3.5 py-2 text-sm font-medium transition-colors',
                  range.value === item.value
                    ? 'border-hpe-orange/50 bg-hpe-orange/10 text-hpe-orange'
                    : 'border-white/10 text-hpe-muted hover:border-white/20 hover:text-hpe-white',
                )}
              >
                {item.label}
              </Link>
            ))}
          </nav>
        }
      />

      <div className="mb-6 flex flex-wrap items-center gap-3 text-sm">
        <Link
          href={{
            pathname: '/admin/agenda',
            query: { visao: range.value, de: addDaysISO(from, -range.days) },
          }}
          className="hpe-btn-subtle hpe-btn-sm"
        >
          ← Anterior
        </Link>
        <Link
          href={{ pathname: '/admin/agenda', query: { visao: range.value } }}
          className="hpe-btn-subtle hpe-btn-sm"
        >
          Hoje
        </Link>
        <Link
          href={{
            pathname: '/admin/agenda',
            query: { visao: range.value, de: addDaysISO(from, range.days) },
          }}
          className="hpe-btn-subtle hpe-btn-sm"
        >
          Próximo →
        </Link>
      </div>

      <AgendaClient
        items={items}
        blocks={blocks.data ?? []}
        services={services.data ?? []}
        students={students.data ?? []}
      />
    </>
  );
}
