import { NextResponse, type NextRequest } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { supabaseConfigured } from '@/lib/supabase/env';
import { APPOINTMENT_STATUS, CONTRACT_STATUS, PAYMENT_STATUS, TRAINING_LEVEL } from '@/lib/labels';
import { formatDate, formatDateTime, todayISO } from '@/lib/utils';

export const dynamic = 'force-dynamic';

/** Escapa um campo para CSV (RFC 4180). */
function cell(value: unknown): string {
  if (value === null || value === undefined) return '';
  const text = String(value);
  return /[";\n\r]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

/** Usa ';' como separador: é o que o Excel em pt-BR espera. */
function toCsv(header: string[], rows: unknown[][]): string {
  const lines = [header, ...rows].map((row) => row.map(cell).join(';'));
  // BOM para o Excel reconhecer UTF-8 e exibir acentos corretamente.
  return `﻿${lines.join('\r\n')}\r\n`;
}

function csvResponse(filename: string, content: string) {
  return new NextResponse(content, {
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="${filename}"`,
      'Cache-Control': 'no-store',
    },
  });
}

export async function GET(
  request: NextRequest,
  { params }: { params: { tipo: string } },
) {
  if (!supabaseConfigured) {
    return NextResponse.json({ error: 'Banco de dados não configurado.' }, { status: 503 });
  }

  const supabase = createClient();

  // Permissão verificada no servidor — a rota não confia no cliente.
  const { data: isAdmin } = await supabase.rpc('is_admin');
  if (!isAdmin) {
    return NextResponse.json({ error: 'Acesso negado.' }, { status: 403 });
  }

  const month = request.nextUrl.searchParams.get('mes') ?? todayISO().slice(0, 7);
  const stamp = todayISO();

  switch (params.tipo) {
    // ─── Alunos ativos ────────────────────────────────────────────────────
    case 'alunos-ativos': {
      const { data } = await supabase
        .from('students')
        .select('*')
        .eq('contract_status', 'active')
        .order('full_name');

      return csvResponse(
        `alunos-ativos-${stamp}.csv`,
        toCsv(
          [
            'Nome',
            'E-mail',
            'Telefone',
            'Objetivo',
            'Nível',
            'Plano',
            'Mensalidade',
            'Vencimento',
            'Desde',
            'Acesso à plataforma',
          ],
          (data ?? []).map((s) => [
            s.full_name,
            s.email,
            s.phone,
            s.main_goal,
            TRAINING_LEVEL[s.training_level],
            s.plan_name,
            s.monthly_fee,
            s.due_day ? `Dia ${s.due_day}` : '',
            formatDate(s.joined_at),
            s.profile_id ? 'Sim' : 'Não',
          ]),
        ),
      );
    }

    // ─── Inadimplentes ────────────────────────────────────────────────────
    case 'inadimplentes': {
      await supabase.rpc('refresh_overdue_payments');
      const { data } = await supabase
        .from('payments')
        .select('*, students(full_name, phone, email)')
        .in('status', ['overdue', 'pending'])
        .lt('due_date', todayISO())
        .order('due_date');

      return csvResponse(
        `inadimplentes-${stamp}.csv`,
        toCsv(
          ['Aluno', 'Telefone', 'E-mail', 'Competência', 'Vencimento', 'Valor', 'Status'],
          (data ?? []).map((p) => {
            const student = p.students as unknown as {
              full_name: string;
              phone: string | null;
              email: string | null;
            } | null;
            return [
              student?.full_name,
              student?.phone,
              student?.email,
              formatDate(p.reference_month, { month: '2-digit', year: 'numeric' }),
              formatDate(p.due_date),
              p.amount,
              PAYMENT_STATUS[p.status].label,
            ];
          }),
        ),
      );
    }

    // ─── Frequência ───────────────────────────────────────────────────────
    case 'frequencia': {
      const [year, monthNumber] = month.split('-').map(Number);
      const monthEnd = new Date(year, monthNumber, 0).toISOString().slice(0, 10);

      const { data } = await supabase
        .from('appointments')
        .select('status, students(id, full_name)')
        .gte('starts_at', `${month}-01T00:00:00-03:00`)
        .lte('starts_at', `${monthEnd}T23:59:59-03:00`);

      const summary = new Map<
        string,
        { name: string; completed: number; noShow: number; cancelled: number; total: number }
      >();

      for (const row of data ?? []) {
        const student = row.students as unknown as { id: string; full_name: string } | null;
        if (!student) continue;
        const entry =
          summary.get(student.id) ?? {
            name: student.full_name,
            completed: 0,
            noShow: 0,
            cancelled: 0,
            total: 0,
          };
        entry.total += 1;
        if (row.status === 'completed') entry.completed += 1;
        if (row.status === 'no_show') entry.noShow += 1;
        if (row.status === 'cancelled') entry.cancelled += 1;
        summary.set(student.id, entry);
      }

      return csvResponse(
        `frequencia-${month}.csv`,
        toCsv(
          ['Aluno', 'Agendados', 'Realizados', 'Faltas', 'Cancelados', 'Taxa de presença'],
          Array.from(summary.values())
            .sort((a, b) => a.name.localeCompare(b.name))
            .map((entry) => [
              entry.name,
              entry.total,
              entry.completed,
              entry.noShow,
              entry.cancelled,
              entry.completed + entry.noShow > 0
                ? `${Math.round((entry.completed / (entry.completed + entry.noShow)) * 100)}%`
                : '—',
            ]),
        ),
      );
    }

    // ─── Agenda ───────────────────────────────────────────────────────────
    case 'agenda': {
      const [year, monthNumber] = month.split('-').map(Number);
      const monthEnd = new Date(year, monthNumber, 0).toISOString().slice(0, 10);

      const { data } = await supabase
        .from('appointments')
        .select('starts_at, ends_at, status, notes, students(full_name), services(name)')
        .gte('starts_at', `${month}-01T00:00:00-03:00`)
        .lte('starts_at', `${monthEnd}T23:59:59-03:00`)
        .order('starts_at');

      return csvResponse(
        `agenda-${month}.csv`,
        toCsv(
          ['Início', 'Fim', 'Aluno', 'Treinamento', 'Status', 'Observação'],
          (data ?? []).map((a) => {
            const student = a.students as unknown as { full_name: string } | null;
            const service = a.services as unknown as { name: string } | null;
            return [
              formatDateTime(a.starts_at),
              formatDateTime(a.ends_at),
              student?.full_name,
              service?.name,
              APPOINTMENT_STATUS[a.status].label,
              a.notes,
            ];
          }),
        ),
      );
    }

    // ─── Faturamento ──────────────────────────────────────────────────────
    case 'faturamento': {
      const { data } = await supabase
        .from('payments')
        .select('*, students(full_name)')
        .eq('reference_month', `${month}-01`)
        .order('due_date');

      return csvResponse(
        `faturamento-${month}.csv`,
        toCsv(
          ['Aluno', 'Vencimento', 'Valor', 'Status', 'Pago em', 'Forma', 'Observações'],
          (data ?? []).map((p) => {
            const student = p.students as unknown as { full_name: string } | null;
            return [
              student?.full_name,
              formatDate(p.due_date),
              p.amount,
              PAYMENT_STATUS[p.status].label,
              p.paid_at ? formatDate(p.paid_at) : '',
              p.method,
              p.notes,
            ];
          }),
        ),
      );
    }

    // ─── Receitas e despesas ──────────────────────────────────────────────
    case 'receitas-despesas': {
      const [year, monthNumber] = month.split('-').map(Number);
      const monthEnd = new Date(year, monthNumber, 0).toISOString().slice(0, 10);

      const [payments, expenses] = await Promise.all([
        supabase
          .from('payments')
          .select('amount, paid_at, method, students(full_name)')
          .eq('status', 'paid')
          .eq('reference_month', `${month}-01`),
        supabase
          .from('expenses')
          .select('*')
          .gte('spent_on', `${month}-01`)
          .lte('spent_on', monthEnd),
      ]);

      const rows: unknown[][] = [
        ...(payments.data ?? []).map((p) => {
          const student = p.students as unknown as { full_name: string } | null;
          return [
            'Receita',
            p.paid_at ? formatDate(p.paid_at) : '',
            `Mensalidade — ${student?.full_name ?? ''}`,
            p.method ?? '',
            p.amount,
          ];
        }),
        ...(expenses.data ?? []).map((e) => [
          'Despesa',
          formatDate(e.spent_on),
          e.description,
          e.category,
          -Number(e.amount),
        ]),
      ];

      return csvResponse(
        `receitas-despesas-${month}.csv`,
        toCsv(['Tipo', 'Data', 'Descrição', 'Categoria/Forma', 'Valor'], rows),
      );
    }

    // ─── Evolução dos alunos ──────────────────────────────────────────────
    case 'evolucao': {
      const { data } = await supabase
        .from('physical_assessments')
        .select('*, students(full_name)')
        .order('assessed_on', { ascending: false })
        .limit(1000);

      return csvResponse(
        `evolucao-${stamp}.csv`,
        toCsv(
          ['Aluno', 'Data', 'Peso (kg)', 'Altura (cm)', '% Gordura', 'Massa magra (kg)', 'FC repouso'],
          (data ?? []).map((a) => {
            const student = a.students as unknown as { full_name: string } | null;
            return [
              student?.full_name,
              formatDate(a.assessed_on),
              a.weight_kg,
              a.height_cm,
              a.body_fat_pct,
              a.lean_mass_kg,
              a.resting_hr,
            ];
          }),
        ),
      );
    }

    default:
      return NextResponse.json({ error: 'Relatório desconhecido.' }, { status: 404 });
  }
}
