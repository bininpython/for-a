'use client';

import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { formatCurrency, formatMonth } from '@/lib/utils';

const ORANGE = '#FF6500';
const ORANGE_2 = '#FF8500';
const MUTED = '#A0A0A0';
const GRID = 'rgba(255,255,255,0.06)';

const axisProps = {
  stroke: MUTED,
  tickLine: false,
  axisLine: false,
  tick: { fill: MUTED, fontSize: 11 },
} as const;

function TooltipBox({
  active,
  payload,
  label,
  formatter,
}: {
  active?: boolean;
  payload?: { name?: string; value?: number | string; color?: string }[];
  label?: string;
  formatter?: (value: number) => string;
}) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-xl border border-white/10 bg-hpe-black-2/95 px-3.5 py-2.5 shadow-card backdrop-blur">
      {label ? (
        <p className="mb-1.5 text-[11px] font-semibold uppercase tracking-wider text-hpe-muted">
          {label}
        </p>
      ) : null}
      {payload.map((entry, i) => (
        <p key={i} className="flex items-center gap-2 text-sm">
          <span
            className="h-2 w-2 rounded-full"
            style={{ background: entry.color ?? ORANGE }}
          />
          <span className="text-hpe-muted">{entry.name}</span>
          <span className="ml-auto font-semibold tabular-nums text-hpe-white">
            {formatter && typeof entry.value === 'number'
              ? formatter(entry.value)
              : entry.value}
          </span>
        </p>
      ))}
    </div>
  );
}

const legendStyle = { fontSize: 12, color: MUTED } as const;

/** Receita recebida × pendente × despesas, por mês. */
export function RevenueChart({
  data,
}: {
  data: { month: string; received: number; pending: number; expenses: number }[];
}) {
  return (
    <ResponsiveContainer width="100%" height={260}>
      <BarChart data={data} margin={{ top: 8, right: 8, bottom: 0, left: -12 }}>
        <CartesianGrid stroke={GRID} vertical={false} />
        <XAxis dataKey="month" tickFormatter={formatMonth} {...axisProps} />
        <YAxis
          {...axisProps}
          tickFormatter={(value: number) =>
            value >= 1000 ? `${Math.round(value / 1000)}k` : String(value)
          }
        />
        <Tooltip
          cursor={{ fill: 'rgba(255,255,255,0.03)' }}
          content={<TooltipBox formatter={formatCurrency} />}
          labelFormatter={formatMonth}
        />
        <Legend wrapperStyle={legendStyle} iconType="circle" iconSize={8} />
        <Bar dataKey="received" name="Recebido" fill={ORANGE} radius={[4, 4, 0, 0]} />
        <Bar
          dataKey="pending"
          name="Pendente"
          fill="rgba(255,133,0,0.35)"
          radius={[4, 4, 0, 0]}
        />
        <Bar
          dataKey="expenses"
          name="Despesas"
          fill="rgba(255,255,255,0.18)"
          radius={[4, 4, 0, 0]}
        />
      </BarChart>
    </ResponsiveContainer>
  );
}

/** Evolução da quantidade de alunos. */
export function StudentsChart({ data }: { data: { month: string; total: number }[] }) {
  return (
    <ResponsiveContainer width="100%" height={260}>
      <AreaChart data={data} margin={{ top: 8, right: 8, bottom: 0, left: -18 }}>
        <defs>
          <linearGradient id="students-fill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={ORANGE} stopOpacity={0.35} />
            <stop offset="100%" stopColor={ORANGE} stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid stroke={GRID} vertical={false} />
        <XAxis dataKey="month" tickFormatter={formatMonth} {...axisProps} />
        <YAxis {...axisProps} allowDecimals={false} />
        <Tooltip content={<TooltipBox />} labelFormatter={formatMonth} />
        <Area
          type="monotone"
          dataKey="total"
          name="Alunos"
          stroke={ORANGE}
          strokeWidth={2.5}
          fill="url(#students-fill)"
          dot={{ r: 3, fill: ORANGE, strokeWidth: 0 }}
          activeDot={{ r: 5 }}
        />
      </AreaChart>
    </ResponsiveContainer>
  );
}

/** Ocupação da agenda nos próximos dias. */
export function OccupancyChart({ data }: { data: { day: string; booked: number }[] }) {
  const formatted = data.map((item) => ({
    ...item,
    label: new Intl.DateTimeFormat('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      timeZone: 'America/Sao_Paulo',
    }).format(new Date(`${item.day}T12:00:00`)),
  }));

  return (
    <ResponsiveContainer width="100%" height={220}>
      <BarChart data={formatted} margin={{ top: 8, right: 8, bottom: 0, left: -24 }}>
        <CartesianGrid stroke={GRID} vertical={false} />
        <XAxis dataKey="label" {...axisProps} interval={1} />
        <YAxis {...axisProps} allowDecimals={false} />
        <Tooltip
          cursor={{ fill: 'rgba(255,255,255,0.03)' }}
          content={<TooltipBox />}
        />
        <Bar
          dataKey="booked"
          name="Atendimentos"
          fill={ORANGE_2}
          radius={[4, 4, 0, 0]}
          maxBarSize={28}
        />
      </BarChart>
    </ResponsiveContainer>
  );
}

/** Série genérica de evolução física ou de carga. */
export function ProgressChart({
  data,
  dataKey,
  name,
  unit = '',
}: {
  data: { label: string; [key: string]: string | number }[];
  dataKey: string;
  name: string;
  unit?: string;
}) {
  return (
    <ResponsiveContainer width="100%" height={240}>
      <LineChart data={data} margin={{ top: 8, right: 12, bottom: 0, left: -18 }}>
        <CartesianGrid stroke={GRID} vertical={false} />
        <XAxis dataKey="label" {...axisProps} />
        <YAxis {...axisProps} domain={['auto', 'auto']} />
        <Tooltip
          content={<TooltipBox formatter={(value) => `${value}${unit}`} />}
        />
        <Line
          type="monotone"
          dataKey={dataKey}
          name={name}
          stroke={ORANGE}
          strokeWidth={2.5}
          dot={{ r: 3.5, fill: ORANGE, strokeWidth: 0 }}
          activeDot={{ r: 5.5 }}
        />
      </LineChart>
    </ResponsiveContainer>
  );
}
