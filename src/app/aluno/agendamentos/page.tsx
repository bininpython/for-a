import { PageHeader } from '@/components/dashboard/PageHeader';
import { AppointmentsClient, type StudentAppointment } from './AppointmentsClient';
import { requireStudent } from '@/lib/auth';
import { createClient } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Agendamentos' };

export default async function StudentAppointmentsPage() {
  const { student } = await requireStudent();
  const supabase = createClient();
  const now = new Date().toISOString();

  const [upcomingResult, pastResult, settingsResult] = await Promise.all([
    supabase
      .from('appointments')
      .select('id, starts_at, ends_at, status, student_notes, services(name)')
      .eq('student_id', student.id)
      .gte('starts_at', now)
      .not('status', 'eq', 'cancelled')
      .order('starts_at'),
    supabase
      .from('appointments')
      .select('id, starts_at, ends_at, status, student_notes, services(name)')
      .eq('student_id', student.id)
      .lt('starts_at', now)
      .order('starts_at', { ascending: false })
      .limit(30),
    supabase
      .from('personal_settings')
      .select('min_hours_to_cancel')
      .limit(1)
      .maybeSingle(),
  ]);

  const map = (rows: typeof upcomingResult.data): StudentAppointment[] =>
    (rows ?? []).map((row) => ({
      id: row.id,
      starts_at: row.starts_at,
      ends_at: row.ends_at,
      status: row.status,
      student_notes: row.student_notes,
      service_name:
        (row.services as unknown as { name: string } | null)?.name ?? null,
    }));

  return (
    <>
      <PageHeader
        title="Meus agendamentos"
        description="Próximos treinos e histórico completo."
      />

      <AppointmentsClient
        upcoming={map(upcomingResult.data)}
        past={map(pastResult.data)}
        minHoursToCancel={settingsResult.data?.min_hours_to_cancel ?? 12}
      />
    </>
  );
}
