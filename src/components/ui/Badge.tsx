import { cn } from '@/lib/utils';

export type Tone = 'orange' | 'green' | 'blue' | 'red' | 'gray';

const TONES: Record<Tone, string> = {
  orange: 'border-hpe-orange/30 bg-hpe-orange/10 text-hpe-orange-2',
  green: 'border-emerald-500/25 bg-emerald-500/10 text-emerald-300',
  blue: 'border-sky-500/25 bg-sky-500/10 text-sky-300',
  red: 'border-red-500/25 bg-red-500/10 text-red-300',
  gray: 'border-white/10 bg-white/[0.04] text-hpe-muted',
};

export function Badge({
  children,
  tone = 'gray',
  className,
  dot = false,
}: {
  children: React.ReactNode;
  tone?: Tone;
  className?: string;
  dot?: boolean;
}) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1',
        'text-[11px] font-semibold uppercase tracking-wider',
        TONES[tone],
        className,
      )}
    >
      {dot ? <span className="h-1.5 w-1.5 rounded-full bg-current" /> : null}
      {children}
    </span>
  );
}
