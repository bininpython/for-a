import type { LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';

export function EmptyState({
  icon: Icon,
  title,
  description,
  action,
  className,
}: {
  icon?: LucideIcon;
  title: string;
  description?: string;
  action?: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        'flex flex-col items-center justify-center gap-3 rounded-2xl border',
        'border-dashed border-white/10 px-6 py-14 text-center',
        className,
      )}
    >
      {Icon ? (
        <span className="mb-1 inline-flex h-12 w-12 items-center justify-center rounded-xl border border-white/10 bg-white/[0.03]">
          <Icon className="h-5 w-5 text-hpe-muted" />
        </span>
      ) : null}
      <p className="font-display text-base font-semibold uppercase tracking-wide">{title}</p>
      {description ? (
        <p className="max-w-md text-sm leading-relaxed text-hpe-muted">{description}</p>
      ) : null}
      {action ? <div className="mt-2">{action}</div> : null}
    </div>
  );
}
