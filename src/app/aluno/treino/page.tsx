import { Dumbbell } from 'lucide-react';
import { PageHeader } from '@/components/dashboard/PageHeader';
import { EmptyState } from '@/components/ui/EmptyState';
import {
  WorkoutSession,
  type LastLoads,
  type LoggedSet,
  type SessionDay,
} from './WorkoutSession';
import { requireStudent } from '@/lib/auth';
import { createClient } from '@/lib/supabase/server';
import { todayISO } from '@/lib/utils';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Meus treinos' };

export default async function WorkoutPage({
  searchParams,
}: {
  searchParams: { dia?: string };
}) {
  const { student } = await requireStudent();
  const supabase = createClient();

  const { data: plan } = await supabase
    .from('training_plans')
    .select('*, training_days(*, exercises(*))')
    .eq('student_id', student.id)
    .eq('published', true)
    .order('updated_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (!plan) {
    return (
      <>
        <PageHeader title="Meus treinos" />
        <EmptyState
          icon={Dumbbell}
          title="Nenhuma ficha publicada"
          description="A execução guiada fica disponível assim que o Patrick publicar sua ficha."
        />
      </>
    );
  }

  const days = ((plan.training_days ?? []) as unknown as SessionDay[])
    .map((day) => ({
      ...day,
      exercises: [...(day.exercises ?? [])].sort((a, b) => a.sort_order - b.sort_order),
    }))
    .sort((a, b) => a.label.localeCompare(b.label))
    .filter((day) => day.exercises.length > 0);

  if (days.length === 0) {
    return (
      <>
        <PageHeader title="Meus treinos" description={plan.name} />
        <EmptyState
          icon={Dumbbell}
          title="Ficha sem exercícios"
          description="Sua ficha ainda não tem exercícios cadastrados. Fale com o Patrick."
        />
      </>
    );
  }

  // Séries já registradas hoje, para retomar o treino de onde parou.
  const { data: logs } = await supabase
    .from('exercise_logs')
    .select('id, exercise_id, set_number, reps_done, load_kg')
    .eq('student_id', student.id)
    .gte('performed_at', `${todayISO()}T00:00:00-03:00`)
    .order('performed_at');

  // Última carga usada em cada exercício, antes de hoje.
  const { data: history } = await supabase
    .from('exercise_logs')
    .select('exercise_id, load_kg, performed_at')
    .eq('student_id', student.id)
    .lt('performed_at', `${todayISO()}T00:00:00-03:00`)
    .not('load_kg', 'is', null)
    .order('performed_at', { ascending: false })
    .limit(300);

  const lastLoads: LastLoads = {};
  for (const entry of history ?? []) {
    if (!(entry.exercise_id in lastLoads)) {
      lastLoads[entry.exercise_id] = entry.load_kg === null ? null : Number(entry.load_kg);
    }
  }

  return (
    <>
      <PageHeader
        title="Treino de hoje"
        description={`${plan.name}${plan.goal ? ` · ${plan.goal}` : ''}`}
      />

      <WorkoutSession
        days={days}
        initialDayId={searchParams.dia}
        todayLogs={(logs ?? []) as LoggedSet[]}
        lastLoads={lastLoads}
      />
    </>
  );
}
