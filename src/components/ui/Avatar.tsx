import { cn, initials } from '@/lib/utils';

export function Avatar({
  name,
  src,
  size = 40,
  className,
}: {
  name: string;
  src?: string | null;
  size?: number;
  className?: string;
}) {
  return (
    <span
      className={cn(
        'relative inline-flex shrink-0 items-center justify-center overflow-hidden',
        'rounded-full border border-white/10 bg-hpe-gray',
        className,
      )}
      style={{ width: size, height: size }}
    >
      {src ? (
        <img src={src} alt={name} className="h-full w-full object-cover" />
      ) : (
        <span
          className="font-display font-bold text-hpe-orange"
          style={{ fontSize: Math.max(11, size * 0.36) }}
        >
          {initials(name) || '—'}
        </span>
      )}
    </span>
  );
}
