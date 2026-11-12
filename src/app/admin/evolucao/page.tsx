import Link from 'next/link';
import { LineChart as LineChartIcon, TrendingDown, TrendingUp } from 'lucide-react';
import { PageHeader } from '@/components/dashboard/PageHeader';
import { EmptyState } from '@/components/ui/EmptyState';
import { ProgressChart } from '@/components/charts/HpeCharts';
import { createClient } from '@/lib/supabase/server';
import { cn, formatDate } from '@/lib/utils';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Evolução dos alunos' };

export default async function EvolutionPage({
  searchParams,
}: {
  searchParams: { aluno?: string };
}) {
  const supabase = createClient();

  const { data: students } = await supabase
    .from('students')
    .select('id, full_name')
    .in('contract_status', ['active', 'paused'])
    .order('full_name');

  const list = students ?? [];
  const selectedId = searchParams.aluno ?? list[0]?.id;

  if (!selectedId) {
    return (
      <>
        <PageHeader title="Evolução dos alunos" />
        <EmptyState
          icon={LineChartIcon}
          title="Nenhum aluno ativo"
          description="Cadastre alunos para acompanhar a evolução deles aqui."
        />
      </>
    );
  }

  const [assessmentsResult, logsResult] = await Promise.all([
    supabase
      .from('physical_assessments')
      .select('*, body_measurements(site, value_cm)')
      .eq('student_id', selectedId)
      .order('assessed_on'),
    supabase
      .from('exercise_logs')
      .select('performed_at, load_kg, exercises(name)')
      .eq('student_id', selectedId)
      .not('load_kg', 'is', null)
      .order('performed_at')
      .limit(400),
  ]);

  const assessments = assessmentsResult.data ?? [];
  const selected = list.find((s) => s.id === selectedId);

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

  // Carga máxima por mês, considerando todos os exercícios registrados.
  const loadByMonth = new Map<string, number>();
  for (const log of logsResult.data ?? []) {
    const month = log.performed_at.slice(0, 7);
    const current = loadByMonth.get(month) ?? 0;
    loadByMonth.set(month, Math.max(current, Number(log.load_kg)));
  }
  const loadSeries = Array.from(loadByMonth.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([month, load]) => ({ label: month, load }));

  const first = weightSeries[0]?.weight;
  const last = weightSeries[weightSeries.length - 1]?.weight;
  const weightDelta = first !== undefined && last !== undefined ? last - first : null;

  return (
    <>
      <PageHeader
        title="Evolução dos alunos"
        description="Séries construídas a partir das avaliações e das cargas registradas pelo aluno."
      />

      <nav className="no-scrollbar mb-6 flex gap-2 overflow-x-auto">
        {list.map((student) => (
          <Link
            key={student.id}
            href={{ pathname: '/admin/evolucao', query: { aluno: student.id } }}
            className={cn(
              'whitespace-nowrap rounded-xl border px-3.5 py-2 text-sm font-medium transition-colors',
              student.id === selectedId
                ? 'border-hpe-orange/50 bg-hpe-orange/10 text-hpe-orange'
                : 'border-white/10 text-hpe-muted hover:border-white/20 hover:text-hpe-white',
            )}
          >
            {student.full_name}
          </Link>
        ))}
      </nav>

      {weightSeries.length === 0 &&
      fatSeries.length === 0 &&
      loadSeries.length === 0 ? (
        <EmptyState
          icon={LineChartIcon}
          title={`Sem dados de evolução para ${selected?.full_name ?? 'este aluno'}`}
          description="Registre uma avaliação física ou aguarde o aluno lançar cargas durante os treinos."
          action={
            <Link
              href={`/admin/avaliacoes?aluno=${selectedId}`}
              className="hpe-btn-primary hpe-btn-sm"
            >
              Registrar avaliação
            </Link>
          }
        />
      ) : (
        <div className="grid gap-5 xl:grid-cols-2">
          {weightSeries.length > 1 ? (
            <ChartCard
              title="Peso corporal"
              hint={
                weightDelta === null
                  ? undefined
                  : `${weightDelta > 0 ? '+' : ''}${weightDelta.toFixed(1)} kg desde a primeira avaliação`
              }
              trend={weightDelta}
            >
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

          {loadSeries.length > 1 ? (
            <ChartCard title="Carga máxima registrada" hint="Maior carga do mês, em kg">
              <ProgressChart data={loadSeries} dataKey="load" name="Carga" unit=" kg" />
            </ChartCard>
          ) : null}

          {weightSeries.length === 1 || fatSeries.length === 1 ? (
            <p className="text-sm text-hpe-muted xl:col-span-2">
              Algumas séries têm apenas uma medição — o gráfico aparece a partir da
              segunda avaliação.
            </p>
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
