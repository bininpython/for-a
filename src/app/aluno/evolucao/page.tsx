import { LineChart as LineChartIcon, TrendingDown, TrendingUp } from 'lucide-react';
import { PageHeader } from '@/components/dashboard/PageHeader';
import { EmptyState } from '@/components/ui/EmptyState';
import { StatCard } from '@/components/ui/StatCard';
import { ProgressChart } from '@/components/charts/HpeCharts';
import { requireStudent } from '@/lib/auth';
import { createClient } from '@/lib/supabase/server';
import { formatDate, monthStartISO } from '@/lib/utils';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Minha evolução' };

export default async function StudentEvolutionPage() {
  const { student } = await requireStudent();
  const supabase = createClient();
  const monthStart = monthStartISO();

  const [assessmentsResult, logsResult, appointmentsResult] = await Promise.all([
    supabase
      .from('physical_assessments')
      .select('*, body_measurements(site, value_cm)')
      .eq('student_id', student.id)
      .order('assessed_on'),
    supabase
      .from('exercise_logs')
      .select('performed_at, load_kg, exercise_id, exercises(name)')
      .eq('student_id', student.id)
      .not('load_kg', 'is', null)
      .order('performed_at')
      .limit(500),
    supabase
      .from('appointments')
      .select('status, starts_at')
      .eq('student_id', student.id)
      .gte('starts_at', `${monthStart}T00:00:00-03:00`),
  ]);

  const assessments = assessmentsResult.data ?? [];
  const logs = logsResult.data ?? [];
  const appointments = appointmentsResult.data ?? [];

  const weightSeries = assessments
    .filter((a) => a.weight_kg !== null)
    .map((a) => ({ label: formatDate(a.assessed_on), weight: Number(a.weight_kg) }));

  const fatSeries = assessments
    .filter((a) => a.body_fat_pct !== null)
    .map((a) => ({ label: formatDate(a.assessed_on), fat: Number(a.body_fat_pct) }));

  const waistSeries = assessments
    .map((a) => {
      const measurements = (a.body_measurements ?? []) as unknown as {
        site: string;
        value_cm: number;
      }[];
      const waist = measurements.find((m) => m.site === 'Cintura');
      return waist
        ? { label: formatDate(a.assessed_on), waist: Number(waist.value_cm) }
        : null;
    })
    .filter((item): item is { label: string; waist: number } => item !== null);

  // Evolução de carga: o exercício com mais registros é o mais representativo.
  const byExercise = new Map<string, { name: string; entries: typeof logs }>();
  for (const log of logs) {
    const name =
      (log.exercises as unknown as { name: string } | null)?.name ?? 'Exercício';
    const entry = byExercise.get(log.exercise_id) ?? { name, entries: [] };
    entry.entries.push(log);
    byExercise.set(log.exercise_id, entry);
  }

  const topExercise = Array.from(byExercise.values()).sort(
    (a, b) => b.entries.length - a.entries.length,
  )[0];

  const loadSeries = topExercise
    ? Array.from(
        topExercise.entries
          .reduce((map, log) => {
            const day = log.performed_at.slice(0, 10);
            map.set(day, Math.max(map.get(day) ?? 0, Number(log.load_kg)));
            return map;
          }, new Map<string, number>())
          .entries(),
      )
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([day, load]) => ({ label: formatDate(day), load }))
    : [];

  const completed = appointments.filter((a) => a.status === 'completed').length;
  const noShows = appointments.filter((a) => a.status === 'no_show').length;
  const attendance =
    completed + noShows > 0 ? Math.round((completed / (completed + noShows)) * 100) : null;

  const first = weightSeries[0]?.weight;
  const last = weightSeries[weightSeries.length - 1]?.weight;
  const weightDelta = first !== undefined && last !== undefined ? last - first : null;

  const hasAnySeries =
    weightSeries.length > 1 ||
    fatSeries.length > 1 ||
    waistSeries.length > 1 ||
    loadSeries.length > 1;

  return (
    <>
      <PageHeader
        title="Minha evolução"
        description="Números reais, vindos das suas avaliações e das cargas que você registrou."
      />

      <section className="mb-6 grid gap-4 sm:grid-cols-3">
        <StatCard
          label="Treinos no mês"
          value={completed}
          hint={`${appointments.length} agendado(s)`}
          tone="orange"
        />
        <StatCard
          label="Frequência"
          value={attendance === null ? '—' : `${attendance}%`}
        />
        <StatCard
          label="Variação de peso"
          value={
            weightDelta === null
              ? '—'
              : `${weightDelta > 0 ? '+' : ''}${weightDelta.toFixed(1)} kg`
          }
          hint={
            weightDelta === null
              ? 'Precisa de ao menos duas avaliações'
              : 'Desde a primeira avaliação'
          }
          tone={weightDelta === null ? 'default' : weightDelta >= 0 ? 'success' : 'orange'}
        />
      </section>

      {!hasAnySeries ? (
        <EmptyState
          icon={LineChartIcon}
          title="Ainda não há dados suficientes"
          description="Os gráficos aparecem a partir da segunda avaliação física ou quando você registrar cargas em mais de um treino."
        />
      ) : (
        <div className="grid gap-5 lg:grid-cols-2">
          {weightSeries.length > 1 ? (
            <ChartCard title="Peso corporal" trend={weightDelta}>
              <ProgressChart data={weightSeries} dataKey="weight" name="Peso" unit=" kg" />
            </ChartCard>
          ) : null}

          {fatSeries.length > 1 ? (
            <ChartCard title="Percentual de gordura">
              <ProgressChart data={fatSeries} dataKey="fat" name="% Gordura" unit="%" />
            </ChartCard>
          ) : null}

          {waistSeries.length > 1 ? (
            <ChartCard title="Cintura">
              <ProgressChart data={waistSeries} dataKey="waist" name="Cintura" unit=" cm" />
            </ChartCard>
          ) : null}

          {loadSeries.length > 1 && topExercise ? (
            <ChartCard
              title="Evolução de carga"
              hint={topExercise.name}
            >
              <ProgressChart data={loadSeries} dataKey="load" name="Carga" unit=" kg" />
            </ChartCard>
          ) : null}
        </div>
      )}
    </>
  );
}

function ChartCard({
  title,
  hint,
  trend,
  children,
}: {
  title: string;
  hint?: string;
  trend?: number | null;
  children: React.ReactNode;
}) {
  return (
    <section className="hpe-card p-5 sm:p-6">
      <div className="mb-5 flex items-start justify-between gap-3">
        <div>
          <h2 className="font-display text-base font-bold uppercase tracking-wide">
            {title}
          </h2>
          {hint ? <p className="mt-1 text-xs text-hpe-muted">{hint}</p> : null}
        </div>
        {trend !== null && trend !== undefined ? (
          trend >= 0 ? (
            <TrendingUp className="h-4 w-4 text-emerald-400" />
          ) : (
            <TrendingDown className="h-4 w-4 text-hpe-orange" />
          )
        ) : null}
      </div>
      {children}
    </section>
  );
}
