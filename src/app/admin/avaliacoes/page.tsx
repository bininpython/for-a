import { PageHeader } from '@/components/dashboard/PageHeader';
import { AssessmentsClient, type AssessmentRow } from './AssessmentsClient';
import { createClient } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Avaliações físicas' };

export default async function AssessmentsPage({
  searchParams,
}: {
  searchParams: { aluno?: string };
}) {
  const supabase = createClient();

  let query = supabase
    .from('physical_assessments')
    .select('*, students(id, full_name), body_measurements(site, value_cm)')
    .order('assessed_on', { ascending: false })
    .limit(100);

  if (searchParams.aluno) query = query.eq('student_id', searchParams.aluno);

  const [assessmentsResult, studentsResult] = await Promise.all([
    query,
    supabase
      .from('students')
      .select('id, full_name')
      .in('contract_status', ['active', 'paused'])
      .order('full_name'),
  ]);

  const assessments: AssessmentRow[] = (assessmentsResult.data ?? []).map((row) => {
    const student = row.students as unknown as { id: string; full_name: string } | null;
    return {
      id: row.id,
      student_id: row.student_id,
      assessed_on: row.assessed_on,
      weight_kg: row.weight_kg,
      height_cm: row.height_cm,
      body_fat_pct: row.body_fat_pct,
      lean_mass_kg: row.lean_mass_kg,
      resting_hr: row.resting_hr,
      notes: row.notes,
      student_name: student?.full_name ?? '—',
      measurements: (row.body_measurements ?? []) as unknown as {
        site: string;
        value_cm: number;
      }[],
    };
  });

  return (
    <>
      <PageHeader
        title="Avaliações físicas"
        description="Peso, composição corporal e medidas. Tudo alimenta a evolução do aluno."
      />

      <AssessmentsClient
        assessments={assessments}
        students={studentsResult.data ?? []}
        initialStudentId={searchParams.aluno}
      />
    </>
  );
}
