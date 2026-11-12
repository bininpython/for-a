import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ArrowLeft } from 'lucide-react';
import { PageHeader } from '@/components/dashboard/PageHeader';
import { PlanBadges, PlanEditor, type DayWithExercises } from './PlanEditor';
import { createClient } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

export default async function PlanEditorPage({ params }: { params: { id: string } }) {
  const supabase = createClient();

  const [planResult, studentsResult] = await Promise.all([
    supabase
      .from('training_plans')
      .select('*, students(id, full_name), training_days(*, exercises(*))')
      .eq('id', params.id)
      .maybeSingle(),
    supabase
      .from('students')
      .select('id, full_name')
      .in('contract_status', ['active', 'paused'])
      .order('full_name'),
  ]);

  const plan = planResult.data;
  if (!plan) notFound();

  const student = plan.students as unknown as { id: string; full_name: string } | null;

  const days = ((plan.training_days ?? []) as unknown as DayWithExercises[])
    .map((day) => ({
      ...day,
      exercises: [...(day.exercises ?? [])].sort((a, b) => a.sort_order - b.sort_order),
    }))
    .sort((a, b) => a.sort_order - b.sort_order || a.label.localeCompare(b.label));

  return (
    <>
      <Link
        href="/admin/fichas"
        className="mb-6 inline-flex items-center gap-2 text-sm text-hpe-muted transition-colors hover:text-hpe-white"
      >
        <ArrowLeft className="h-4 w-4" />
        Voltar para fichas
      </Link>

      <PageHeader
        title={plan.name}
        description={
          [
            student ? `Aluno: ${student.full_name}` : 'Modelo reutilizável',
            plan.goal,
          ]
            .filter(Boolean)
            .join(' · ') || undefined
        }
        actions={<PlanBadges plan={plan} />}
      />

      {plan.notes ? (
        <p className="mb-6 rounded-xl border border-white/10 bg-white/[0.02] px-4 py-3 text-sm leading-relaxed text-hpe-muted">
          {plan.notes}
        </p>
      ) : null}

      <PlanEditor
        plan={plan}
        days={days}
        students={studentsResult.data ?? []}
        studentName={student?.full_name ?? null}
      />
    </>
  );
}
