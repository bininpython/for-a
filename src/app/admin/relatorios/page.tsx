import {
  AlertCircle,
  CalendarDays,
  CircleDollarSign,
  Download,
  LineChart,
  Percent,
  Scale,
  Users,
} from 'lucide-react';
import { PageHeader } from '@/components/dashboard/PageHeader';
import { PrintButton } from './PrintButton';
import { todayISO } from '@/lib/utils';

export const metadata = { title: 'Relatórios' };

const REPORTS = [
  {
    slug: 'alunos-ativos',
    title: 'Alunos ativos',
    description: 'Cadastro completo dos alunos com contrato ativo, plano e situação de acesso.',
    icon: Users,
    monthly: false,
  },
  {
    slug: 'inadimplentes',
    title: 'Alunos inadimplentes',
    description: 'Mensalidades vencidas e ainda em aberto, com contato de cada aluno.',
    icon: AlertCircle,
    monthly: false,
  },
  {
    slug: 'frequencia',
    title: 'Frequência dos alunos',
    description: 'Agendados, realizados, faltas e taxa de presença por aluno no mês.',
    icon: Percent,
    monthly: true,
  },
  {
    slug: 'agenda',
    title: 'Agenda de atendimentos',
    description: 'Todos os atendimentos do mês com horário, aluno, tipo e status.',
    icon: CalendarDays,
    monthly: true,
  },
  {
    slug: 'faturamento',
    title: 'Faturamento mensal',
    description: 'Mensalidades da competência, com status e data de confirmação.',
    icon: CircleDollarSign,
    monthly: true,
  },
  {
    slug: 'receitas-despesas',
    title: 'Receitas e despesas',
    description: 'Movimento consolidado do mês, com receitas confirmadas e despesas lançadas.',
    icon: Scale,
    monthly: true,
  },
  {
    slug: 'evolucao',
    title: 'Evolução dos alunos',
    description: 'Histórico de avaliações físicas de todos os alunos.',
    icon: LineChart,
    monthly: false,
  },
] as const;

export default function ReportsPage({
  searchParams,
}: {
  searchParams: { mes?: string };
}) {
  const month = searchParams.mes ?? todayISO().slice(0, 7);

  return (
    <>
      <PageHeader
        title="Relatórios"
        description="Exportação em CSV (abre no Excel e no Google Sheets) e versão para impressão ou PDF."
      />

      <form method="get" className="mb-6 flex flex-wrap items-end gap-3">
        <label className="block">
          <span className="hpe-label">Competência dos relatórios mensais</span>
          <input
            type="month"
            name="mes"
            defaultValue={month}
            className="hpe-input w-48"
          />
        </label>
        <button type="submit" className="hpe-btn-ghost hpe-btn-sm">
          Aplicar
        </button>
      </form>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {REPORTS.map((report) => (
          <article key={report.slug} className="hpe-card flex flex-col p-5">
            <span className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-hpe-orange/25 bg-hpe-orange/[0.07]">
              <report.icon className="h-4 w-4 text-hpe-orange" />
            </span>

            <h2 className="mt-4 font-display text-base font-bold uppercase tracking-wide">
              {report.title}
            </h2>
            <p className="mt-2 flex-1 text-sm leading-relaxed text-hpe-muted">
              {report.description}
            </p>

            <div className="mt-5 flex items-center justify-between gap-3 border-t border-white/[0.07] pt-4">
              <span className="text-xs text-white/35">
                {report.monthly ? `Competência ${month}` : 'Posição atual'}
              </span>
              <a
                href={`/api/relatorios/${report.slug}${report.monthly ? `?mes=${month}` : ''}`}
                className="inline-flex items-center gap-1.5 text-sm font-semibold uppercase tracking-wider text-hpe-orange transition-colors hover:text-hpe-orange-2"
                download
              >
                <Download className="h-4 w-4" />
                CSV
              </a>
            </div>
          </article>
        ))}
      </div>

      <section className="mt-8 hpe-card p-5 sm:p-6">
        <h2 className="hpe-display text-base">Exportar em PDF</h2>
        <p className="mt-2 max-w-2xl text-sm leading-relaxed text-hpe-muted">
          Qualquer tela do painel pode ser salva em PDF pela impressão do navegador —
          escolha <strong className="text-hpe-white">Salvar como PDF</strong> no destino.
          A folha de estilos de impressão já remove menus e botões e ajusta as cores
          para papel.
        </p>
        <div className="mt-5">
          <PrintButton />
        </div>
      </section>
    </>
  );
}
