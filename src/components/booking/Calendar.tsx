'use client';

import { useMemo, useState } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { cn, WEEKDAYS_SHORT, todayISO } from '@/lib/utils';

/** Calendário mensal em português, com limite de horizonte de agendamento. */
export function Calendar({
  selected,
  onSelect,
  minDate = todayISO(),
  maxDate,
  disabledWeekdays = [],
  className,
}: {
  selected: string | null;
  onSelect: (date: string) => void;
  minDate?: string;
  maxDate?: string;
  /** Dias da semana sem atendimento (0 = domingo). */
  disabledWeekdays?: number[];
  className?: string;
}) {
  const [cursor, setCursor] = useState(() => {
    const base = selected ?? minDate;
    return { year: Number(base.slice(0, 4)), month: Number(base.slice(5, 7)) - 1 };
  });

  const cells = useMemo(() => {
    const first = new Date(cursor.year, cursor.month, 1);
    const daysInMonth = new Date(cursor.year, cursor.month + 1, 0).getDate();
    const leading = first.getDay();

    const result: (string | null)[] = Array.from({ length: leading }, () => null);
    for (let day = 1; day <= daysInMonth; day += 1) {
      result.push(
        `${cursor.year}-${String(cursor.month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`,
      );
    }
    while (result.length % 7 !== 0) result.push(null);
    return result;
  }, [cursor]);

  const monthLabel = new Intl.DateTimeFormat('pt-BR', {
    month: 'long',
    year: 'numeric',
  }).format(new Date(cursor.year, cursor.month, 1));

  const canGoBack =
    `${cursor.year}-${String(cursor.month + 1).padStart(2, '0')}` > minDate.slice(0, 7);
  const canGoForward =
    !maxDate ||
    `${cursor.year}-${String(cursor.month + 1).padStart(2, '0')}` < maxDate.slice(0, 7);

  function shift(delta: number) {
    setCursor((prev) => {
      const next = new Date(prev.year, prev.month + delta, 1);
      return { year: next.getFullYear(), month: next.getMonth() };
    });
  }

  return (
    <div className={cn('hpe-card p-5', className)}>
      <div className="mb-5 flex items-center justify-between gap-3">
        <button
          type="button"
          onClick={() => shift(-1)}
          disabled={!canGoBack}
          aria-label="Mês anterior"
          className="rounded-lg p-2 text-hpe-muted transition-colors hover:bg-white/5 hover:text-hpe-white disabled:pointer-events-none disabled:opacity-25"
        >
          <ChevronLeft className="h-4 w-4" />
        </button>
        <p className="font-display text-base font-bold uppercase tracking-wide">
          {monthLabel}
        </p>
        <button
          type="button"
          onClick={() => shift(1)}
          disabled={!canGoForward}
          aria-label="Próximo mês"
          className="rounded-lg p-2 text-hpe-muted transition-colors hover:bg-white/5 hover:text-hpe-white disabled:pointer-events-none disabled:opacity-25"
        >
          <ChevronRight className="h-4 w-4" />
        </button>
      </div>

      <div className="grid grid-cols-7 gap-1">
        {WEEKDAYS_SHORT.map((label) => (
          <div
            key={label}
            className="pb-2 text-center text-[10px] font-semibold uppercase tracking-wider text-hpe-muted"
          >
            {label}
          </div>
        ))}

        {cells.map((date, index) => {
          if (!date) return <div key={`empty-${index}`} />;

          const weekday = new Date(
            Number(date.slice(0, 4)),
            Number(date.slice(5, 7)) - 1,
            Number(date.slice(8, 10)),
          ).getDay();

          const disabled =
            date < minDate ||
            (maxDate ? date > maxDate : false) ||
            disabledWeekdays.includes(weekday);

          const isSelected = date === selected;
          const isToday = date === todayISO();

          return (
            <button
              key={date}
              type="button"
              disabled={disabled}
              onClick={() => onSelect(date)}
              aria-pressed={isSelected}
              className={cn(
                'relative aspect-square rounded-xl text-sm font-medium tabular-nums',
                'transition-all duration-200 ease-hpe',
                disabled && 'cursor-not-allowed text-white/15',
                !disabled && !isSelected && 'text-hpe-white hover:bg-white/[0.06]',
                isSelected && 'bg-hpe-orange font-bold text-hpe-black shadow-glow',
              )}
            >
              {Number(date.slice(8, 10))}
              {isToday && !isSelected ? (
                <span className="absolute inset-x-0 bottom-1.5 mx-auto h-1 w-1 rounded-full bg-hpe-orange" />
              ) : null}
            </button>
          );
        })}
      </div>
    </div>
  );
}
