import { cn } from '@/lib/utils';

/**
 * Identidade HPE.
 *
 * `public/logo-hpe.png` é o arquivo oficial da marca e é o que aparece por
 * padrão no cabeçalho e no rodapé. Se Patrick enviar uma versão atualizada
 * pelo painel (/admin/perfil), `personal_settings.logo_url` assume o lugar.
 *
 * `HpeMark` é a redução vetorial da marca — mesmas letras chanfradas, no
 * formato quadrado usado em favicon, avatares e espaços pequenos, onde o
 * lockup horizontal não caberia.
 */

export const DEFAULT_LOGO = '/logo-hpe.png';

/** Letras HPE no traço angular da marca. Desenhadas, não tipografadas. */
export function HpeWordmark({
  className,
  tagline = 'FORÇA BRUTA',
}: {
  className?: string;
  tagline?: string | null;
}) {
  return (
    <svg
      viewBox="0 0 274 148"
      role="img"
      aria-label={tagline ? `HPE — ${tagline}` : 'HPE'}
      className={cn('h-10 w-auto', className)}
    >
      <defs>
        <linearGradient id="hpe-wm" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#FF8500" />
          <stop offset="100%" stopColor="#FF6500" />
        </linearGradient>
      </defs>

      <g fill="url(#hpe-wm)" transform="skewX(-5)">
        {/* H */}
        <path d="M0 20 L20 0 L28 0 L28 100 L0 100 Z" />
        <path d="M58 0 L86 0 L86 80 L66 100 L58 100 Z" />
        <path d="M28 40 L58 40 L58 62 L28 62 Z" />

        {/* P */}
        <g transform="translate(100 0)">
          <path d="M0 20 L20 0 L28 0 L28 100 L0 100 Z" />
          <path
            fillRule="evenodd"
            d="M28 0 L80 0 L80 34 L58 56 L28 56 Z M44 16 L64 16 L64 30 L52 42 L44 42 Z"
          />
        </g>

        {/* E */}
        <path d="M194 20 L214 0 L274 0 L274 22 L222 22 L222 38 L262 38 L262 60 L222 60 L222 78 L274 78 L274 92 L266 100 L194 100 Z" />
      </g>

      {tagline ? (
        <text
          x="137"
          y="138"
          textAnchor="middle"
          fill="#FFFFFF"
          fontFamily="var(--font-display), system-ui, sans-serif"
          fontSize="26"
          fontWeight="700"
          letterSpacing="9"
        >
          {tagline}
        </text>
      ) : null}
    </svg>
  );
}

/** Redução quadrada da marca, para ícones e espaços pequenos. */
export function HpeMark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 64 64" role="img" aria-label="HPE" className={cn('h-10 w-10', className)}>
      <defs>
        <linearGradient id="hpe-mark-g" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#FF8500" />
          <stop offset="100%" stopColor="#FF6500" />
        </linearGradient>
      </defs>
      <rect width="64" height="64" rx="14" fill="#050505" />
      <rect
        x="1.25"
        y="1.25"
        width="61.5"
        height="61.5"
        rx="12.75"
        fill="none"
        stroke="url(#hpe-mark-g)"
        strokeWidth="2.5"
        opacity="0.5"
      />
      <g
        fill="url(#hpe-mark-g)"
        transform="translate(6.5 18) scale(0.186) skewX(-5)"
      >
        <path d="M0 20 L20 0 L28 0 L28 100 L0 100 Z" />
        <path d="M58 0 L86 0 L86 80 L66 100 L58 100 Z" />
        <path d="M28 40 L58 40 L58 62 L28 62 Z" />
        <g transform="translate(100 0)">
          <path d="M0 20 L20 0 L28 0 L28 100 L0 100 Z" />
          <path
            fillRule="evenodd"
            d="M28 0 L80 0 L80 34 L58 56 L28 56 Z M44 16 L64 16 L64 30 L52 42 L44 42 Z"
          />
        </g>
        <path d="M194 20 L214 0 L274 0 L274 22 L222 22 L222 38 L262 38 L262 60 L222 60 L222 78 L274 78 L274 92 L266 100 L194 100 Z" />
      </g>
    </svg>
  );
}

/**
 * Lockup usado no cabeçalho, rodapé e painéis.
 * `subtitle` identifica o profissional; a assinatura "FORÇA BRUTA" pertence
 * ao arquivo da marca e não é repetida ao lado dele.
 */
export function HpeLogo({
  className,
  subtitle = 'PATRICK PERSONAL',
  logoUrl,
  compact = false,
}: {
  className?: string;
  subtitle?: string | null;
  logoUrl?: string | null;
  compact?: boolean;
}) {
  const src = logoUrl || DEFAULT_LOGO;

  if (compact) {
    return <HpeMark className={className} />;
  }

  return (
    <span className={cn('inline-flex items-center gap-3.5', className)}>
      <img
        src={src}
        alt="HPE — Força Bruta"
        className="h-10 w-auto shrink-0 object-contain"
      />
      {subtitle ? (
        <span className="hidden border-l border-white/12 pl-3.5 text-[10px] font-semibold uppercase leading-tight tracking-[0.2em] text-hpe-muted sm:block">
          {subtitle}
        </span>
      ) : null}
    </span>
  );
}
