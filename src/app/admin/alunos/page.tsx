import Link from 'next/link';
import { Search, UserPlus, Users } from 'lucide-react';
import { PageHeader } from '@/components/dashboard/PageHeader';
import { Avatar } from '@/components/ui/Avatar';
import { Badge } from '@/components/ui/Badge';
import { EmptyState } from '@/components/ui/EmptyState';
import { createClient } from '@/lib/supabase/server';
import { CONTRACT_STATUS, TRAINING_LEVEL } from '@/lib/labels';
import type { ContractStatus, Student } from '@/lib/supabase/database.types';
import { cn, formatCurrency, formatDate, formatPhone } from '@/lib/utils';

export const dynamic = 'force-dynamic';

const FILTERS: { value: string; label: string }[] = [
  { value: 'active', label: 'Ativos' },
  { value: 'paused', label: 'Pausados' },
  { value: 'inactive', label: 'Inativos' },
  { value: 'archived', label: 'Arquivados' },
  { value: 'all', label: 'Todos' },
];

export default async function StudentsPage({
  searchParams,
}: {
  searchParams: { q?: string; situacao?: string };
}) {
  const supabase = createClient();
  const filter = searchParams.situacao ?? 'active';
  const search = searchParams.q?.trim() ?? '';

  let query = supabase.from('students').select('*').order('full_name');

  if (filter !== 'all') {
    query = query.eq('contract_status', filter as ContractStatus);
  }
  if (search) {
    query = query.or(
      `full_name.ilike.%${search}%,email.ilike.%${search}%,phone.ilike.%${search}%`,
    );
  }

  const { data: students } = await query;
  const list = (students ?? []) as Student[];

  return (
    <>
      <PageHeader
        title="Alunos"
        description="Cadastro, situação contratual e acesso de cada aluno."
        actions={
          <Link href="/admin/alunos/novo" className="hpe-btn-primary hpe-btn-sm">
            <UserPlus className="h-4 w-4" />
            Novo aluno
          </Link>
        }
      />

      {/* ─── Filtros ────────────────────────────────────────────────────── */}
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <nav className="no-scrollbar flex gap-2 overflow-x-auto">
          {FILTERS.map((item) => {
            const active = filter === item.value;
            return (
              <Link
                key={item.value}
                href={{
                  pathname: '/admin/alunos',
                  query: { ...(search ? { q: search } : {}), situacao: item.value },
                }}
                className={cn(
                  'whitespace-nowrap rounded-xl border px-3.5 py-2 text-sm font-medium transition-colors',
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

        <form method="get" className="relative sm:w-72">
          <input type="hidden" name="situacao" value={filter} />
          <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-hpe-muted" />
          <input
            name="q"
            defaultValue={search}
            placeholder="Buscar por nome, e-mail ou telefone"
            className="hpe-input pl-10"
            aria-label="Buscar aluno"
          />
        </form>
      </div>

      {/* ─── Lista ──────────────────────────────────────────────────────── */}
      {list.length === 0 ? (
        <EmptyState
          icon={Users}
          title={search ? 'Nenhum aluno encontrado' : 'Nenhum aluno nesta situação'}
          description={
            search
              ? `A busca por “${search}” não retornou resultados.`
              : 'Cadastre o primeiro aluno para começar a montar fichas e agendar treinos.'
          }
          action={
            <Link href="/admin/alunos/novo" className="hpe-btn-primary hpe-btn-sm">
              <UserPlus className="h-4 w-4" />
              Cadastrar aluno
            </Link>
          }
        />
      ) : (
        <>
          {/* Tabela — telas grandes */}
          <div className="hpe-card hidden overflow-hidden lg:block">
            <div className="overflow-x-auto">
              <table className="hpe-table">
                <thead>
                  <tr>
                    <th>Aluno</th>
                    <th>Contato</th>
                    <th>Objetivo</th>
                    <th>Nível</th>
                    <th>Plano</th>
                    <th>Desde</th>
                    <th>Situação</th>
                  </tr>
                </thead>
                <tbody>
                  {list.map((student) => {
                    const status = CONTRACT_STATUS[student.contract_status];
                    return (
                      <tr key={student.id} className="cursor-pointer">
                        <td>
                          <Link
                            href={`/admin/alunos/${student.id}`}
                            className="flex items-center gap-3"
                          >
                            <Avatar
                              name={student.full_name}
                              src={student.photo_url}
                              size={36}
                            />
                            <div className="min-w-0">
                              <p className="truncate font-medium">{student.full_name}</p>
                              {!student.profile_id ? (
                                <p className="text-xs text-hpe-muted">Sem acesso</p>
                              ) : null}
                            </div>
                          </Link>
                        </td>
                        <td className="text-sm text-hpe-muted">
                          {formatPhone(student.phone)}
                        </td>
                        <td className="max-w-[16rem] truncate text-sm text-hpe-muted">
                          {student.main_goal ?? '—'}
                        </td>
                        <td className="text-sm text-hpe-muted">
                          {TRAINING_LEVEL[student.training_level]}
                        </td>
                        <td className="text-sm">
                          {student.plan_name ? (
                            <>
                              <span className="block">{student.plan_name}</span>
                              <span className="text-xs text-hpe-muted">
                                {formatCurrency(student.monthly_fee)}
                              </span>
                            </>
                          ) : (
                            <span className="text-hpe-muted">—</span>
                          )}
                        </td>
                        <td className="text-sm tabular-nums text-hpe-muted">
                          {formatDate(student.joined_at)}
                        </td>
                        <td>
                          <Badge tone={status.tone} dot>
                            {status.label}
                          </Badge>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* Cartões — telas pequenas */}
          <div className="grid gap-3 lg:hidden">
            {list.map((student) => {
              const status = CONTRACT_STATUS[student.contract_status];
              return (
                <Link
                  key={student.id}
                  href={`/admin/alunos/${student.id}`}
                  className="hpe-card hpe-card-hover flex items-center gap-4 p-4"
                >
                  <Avatar name={student.full_name} src={student.photo_url} size={44} />
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-medium">{student.full_name}</p>
                    <p className="truncate text-xs text-hpe-muted">
                      {student.main_goal ?? TRAINING_LEVEL[student.training_level]}
                    </p>
                    {student.plan_name ? (
                      <p className="mt-1 text-xs text-hpe-muted">
                        {student.plan_name} · {formatCurrency(student.monthly_fee)}
                      </p>
                    ) : null}
                  </div>
                  <Badge tone={status.tone} dot>
                    {status.label}
                  </Badge>
                </Link>
              );
            })}
          </div>

          <p className="mt-5 text-xs text-hpe-muted">
            {list.length} aluno{list.length === 1 ? '' : 's'} listado
            {list.length === 1 ? '' : 's'}.
          </p>
        </>
      )}
    </>
  );
}
