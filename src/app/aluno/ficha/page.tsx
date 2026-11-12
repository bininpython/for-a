import Link from 'next/link';
import { ClipboardList, Dumbbell, Play } from 'lucide-react';
import { PageHeader } from '@/components/dashboard/PageHeader';
import { EmptyState } from '@/components/ui/EmptyState';
import { requireStudent } from '@/lib/auth';
import { createClient } from '@/lib/supabase/server';
import type { Exercise } from '@/lib/supabase/database.types';
import { formatDate, formatSeconds } from '@/lib/utils';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Minha ficha' };

export default async function StudentPlanPage() {
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
        <PageHeader title="Minha ficha" />
        <EmptyState
          icon={ClipboardList}
          title="Nenhuma ficha publicada"
          description="Assim que o Patrick publicar sua ficha de treino, ela aparece aqui com todos os exercícios, séries e cargas."
        />
      </>
    );
  }

  const days = ((plan.training_days ?? []) as unknown as (typeof plan.training_days &
    { exercises: Exercise[] }[]))
    .map((day) => ({
      ...day,
      exercises: [...(day.exercises ?? [])].sort((a, b) => a.sort_order - b.sort_order),
    }))
    .sort((a, b) => a.sort_order - b.sort_order || a.label.localeCompare(b.label));

  return (
    <>
      <PageHeader
        title={plan.name}
        description={
          [plan.goal, plan.split, `Atualizada em ${formatDate(plan.updated_at)}`]
            .filter(Boolean)
            .join(' · ')
        }
        actions={
          <Link href="/aluno/treino" className="hpe-btn-primary hpe-btn-sm">
            <Play className="h-4 w-4" />
            Executar treino
          </Link>
        }
      />

      {plan.notes ? (
        <p className="mb-6 rounded-xl border border-hpe-orange/25 bg-hpe-orange/[0.05] px-4 py-3 text-sm leading-relaxed text-hpe-muted">
          {plan.notes}
        </p>
      ) : null}

      <div className="space-y-5">
        {days.map((day) => (
          <section key={day.id} className="hpe-card overflow-hidden">
            <header className="flex items-center gap-3 border-b border-white/[0.07] px-5 py-4">
              <span className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-hpe-orange font-display text-lg font-extrabold text-hpe-black">
                {day.label}
              </span>
              <div className="min-w-0 flex-1">
                <h2 className="font-display text-base font-bold uppercase tracking-wide">
                  {day.title}
                </h2>
                <p className="text-xs text-hpe-muted">
                  {day.exercises.length} exercício{day.exercises.length === 1 ? '' : 's'}
                </p>
              </div>
              <Link
                href={`/aluno/treino?dia=${day.id}`}
                className="hpe-btn-subtle hpe-btn-sm shrink-0"
              >
                <Play className="h-3.5 w-3.5" />
                Executar
              </Link>
            </header>

            {day.notes ? (
              <p className="border-b border-white/[0.05] px-5 py-3 text-sm text-hpe-muted">
                {day.notes}
              </p>
            ) : null}

            <ul className="divide-y divide-white/[0.05]">
              {day.exercises.map((exercise, index) => (
                <li key={exercise.id} className="flex items-center gap-4 px-5 py-4">
                  {exercise.media_url ? (
                    <img
                      src={exercise.media_url}
                      alt=""
                      className="h-14 w-14 shrink-0 rounded-xl border border-white/10 object-cover"
                    />
                  ) : (
                    <span className="inline-flex h-14 w-14 shrink-0 items-center justify-center rounded-xl border border-white/10 bg-white/[0.02]">
                      <Dumbbell className="h-5 w-5 text-white/20" />
                    </span>
                  )}

                  <div className="min-w-0 flex-1">
                    <p className="font-medium">
                      <span className="mr-2 text-hpe-muted tabular-nums">
                        {index + 1}.
                      </span>
                      {exercise.name}
                    </p>
                    <p className="mt-0.5 text-xs text-hpe-muted">
                      {[
                        exercise.muscle_group,
                        `${exercise.sets} × ${exercise.reps}`,
                        exercise.load_kg ? `${exercise.load_kg} kg` : null,
                        `descanso ${formatSeconds(exercise.rest_seconds)}`,
                      ]
                        .filter(Boolean)
                        .join(' · ')}
                    </p>
                    {exercise.notes ? (
                      <p className="mt-1 text-xs text-white/40">{exercise.notes}</p>
                    ) : null}
                  </div>
                </li>
              ))}
            </ul>
          </section>
        ))}
      </div>
    </>
  );
}
