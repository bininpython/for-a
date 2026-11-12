import { cn } from '@/lib/utils';

export function Field({
  label,
  htmlFor,
  hint,
  error,
  required,
  className,
  children,
}: {
  label: string;
  htmlFor?: string;
  hint?: string;
  error?: string | null;
  required?: boolean;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <div className={cn('w-full', className)}>
      <label className="hpe-label" htmlFor={htmlFor}>
        {label}
        {required ? <span className="ml-1 text-hpe-orange">*</span> : null}
      </label>
      {children}
      {error ? (
        <p className="hpe-field-error">{error}</p>
      ) : hint ? (
        <p className="mt-1.5 text-xs text-hpe-muted/80">{hint}</p>
      ) : null}
    </div>
  );
}

export function SubmitButton({
  pending,
  children,
  className,
  pendingLabel = 'Salvando…',
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement> & {
  pending?: boolean;
  pendingLabel?: string;
}) {
  return (
    <button
      type="submit"
      disabled={pending || props.disabled}
      className={cn('hpe-btn-primary', className)}
      {...props}
    >
      {pending ? (
        <>
          <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-current border-t-transparent" />
          {pendingLabel}
        </>
      ) : (
        children
      )}
    </button>
  );
}
