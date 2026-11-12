import type { LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';

export function StatCard({
  label,
  value,
  hint,
  icon: Icon,
  tone = 'default',
  className,
}: {
  label: string;
  value: string | number;
  hint?: string;
  icon?: LucideIcon;
  tone?: 'default' | 'orange' | 'danger' | 'success';
  className?: string;
}) {
  const accent = {
    default: 'text-hpe-muted',
    orange: 'text-hpe-orange',
    danger: 'text-red-400',
    success: 'text-emerald-400',
  }[tone];

  return (
    <div className={cn('hpe-card p-5', className)}>
      <div className="flex items-start justify-between gap-3">
        <p className="text-[11px] font-semibold uppercase tracking-wider text-hpe-muted">
          {label}
        </p>
        {Icon ? <Icon className={cn('h-4 w-4 shrink-0', accent)} /> : null}
      </div>
      <p className="mt-3 font-display text-3xl font-extrabold leading-none tracking-tight">
        {value}
      </p>
      {hint ? <p className="mt-2 text-xs text-hpe-muted">{hint}</p> : null}
    </div>
  );
}
