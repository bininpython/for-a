import Link from 'next/link';
import { ClipboardList, Plus } from 'lucide-react';
import { PageHeader } from '@/components/dashboard/PageHeader';
import { Badge } from '@/components/ui/Badge';
import { EmptyState } from '@/components/ui/EmptyState';
import { createClient } from '@/lib/supabase/server';
import { cn, formatDate } from '@/lib/utils';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Fichas de treino' };

export default async function PlansPage({
  searchParams,
}: {
  searchParams: { tipo?: string };
}) {
  const supabase = createClient();
  const showTemplates = searchParams.tipo === 'modelos';

  const { data: plans } = await supabase
    .from('training_plans')
    .select('*, students(id, full_name), training_days(id, exercises(id))')
    .eq('is_template', showTemplates)
    .order('updated_at', { ascending: false });

  const list = plans ?? [];

  return (
    <>
      <PageHeader
        title="Fichas de treino"
        description="Prescrições individuais e modelos reutilizáveis."
        actions={
          <Link href="/admin/fichas/nova" className="hpe-btn-primary hpe-btn-sm">
            <Plus className="h-4 w-4" />
            Nova ficha
          </Link>
        }
      />

      <nav className="mb-6 flex gap-2">
        {[
          { value: 'alunos', label: 'Fichas de alunos' },
          { value: 'modelos', label: 'Modelos reutilizáveis' },
        ].map((item) => {
          const active = (searchParams.tipo ?? 'alunos') === item.value;
          return (
            <Link
              key={item.value}
              href={{ pathname: '/admin/fichas', query: { tipo: item.value } }}
              className={cn(
                'rounded-xl border px-3.5 py-2 text-sm font-medium transition-colors',
                active
                  ? 'border-hpe-orange/50 bg-hpe-orange/10 text-hpe-orange'
                  : 'border-white/10 text-hpe-muted hover:border-white/20 hover:text-hpe-white',
              )}
            >
              {item.label}
            </Link>
          );
        })}
      </nav>

      {list.length === 0 ? (
        <EmptyState
          icon={ClipboardList}
          title={showTemplates ? 'Nenhum modelo salvo' : 'Nenhuma ficha montada'}
          description={
            showTemplates
              ? 'Modelos aceleram a montagem: crie uma vez e copie para quantos alunos quiser.'
              : 'Monte a primeira ficha e publique para o aluno acompanhar pelo celular.'
          }
          action={
            <Link href="/admin/fichas/nova" className="hpe-btn-primary hpe-btn-sm">
              <Plus className="h-4 w-4" />
              Criar ficha
            </Link>
          }
        />
      ) : (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {list.map((plan) => {
            const student = plan.students as unknown as {
              id: string;
              full_name: string;
            } | null;
            const days = (plan.training_days ?? []) as { exercises: { id: string }[] }[];
            const exerciseCount = days.reduce(
              (sum, day) => sum + (day.exercises?.length ?? 0),
              0,
            );

            return (
              <Link
                key={plan.id}
                href={`/admin/fichas/${plan.id}`}
                className="hpe-card hpe-card-hover flex flex-col p-5"
              >
                <div className="flex items-start justify-between gap-3">
                  <h2 className="font-display text-base font-bold uppercase leading-tight tracking-wide">
                    {plan.name}
                  </h2>
                  {plan.is_template ? (
                    <Badge tone="blue">Modelo</Badge>
                  ) : (
                    <Badge tone={plan.published ? 'green' : 'gray'}>
                      {plan.published ? 'Publicada' : 'Rascunho'}
                    </Badge>
                  )}
                </div>

                {student ? (
                  <p className="mt-2 text-sm text-hpe-orange">{student.full_name}</p>
                ) : null}
                {plan.goal ? (
                  <p className="mt-2 flex-1 text-sm text-hpe-muted">{plan.goal}</p>
                ) : (
                  <div className="flex-1" />
                )}

                <p className="mt-4 border-t border-white/[0.06] pt-4 text-xs text-hpe-muted">
                  {plan.split ?? 'Personalizada'} · {days.length} dia(s) ·{' '}
                  {exerciseCount} exercício(s)
                </p>
                <p className="mt-1 text-xs text-white/30">
                  Atualizada em {formatDate(plan.updated_at)}
                </p>
              </Link>
            );
          })}
        </div>
      )}
    </>
  );
}
