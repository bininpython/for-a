import { Database } from 'lucide-react';

/**
 * Exibido quando as variáveis do Supabase não estão definidas.
 * Preferimos uma instrução honesta a dados fictícios na tela.
 */
export function SetupNotice({ context }: { context?: string }) {
  return (
    <div className="mx-auto max-w-2xl rounded-2xl border border-hpe-orange/25 bg-hpe-orange/[0.05] p-6 sm:p-8">
      <div className="flex items-start gap-4">
        <span className="mt-0.5 inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-hpe-orange/30 bg-hpe-orange/10">
          <Database className="h-5 w-5 text-hpe-orange" />
        </span>
        <div className="space-y-3">
          <h2 className="hpe-display text-lg">Banco de dados não conectado</h2>
          <p className="text-sm leading-relaxed text-hpe-muted">
            {context ?? 'Esta área depende do Supabase.'} Defina as variáveis de
            ambiente abaixo e aplique as migrations de{' '}
            <code className="rounded bg-black/40 px-1.5 py-0.5 text-xs text-hpe-white">
              supabase/migrations
            </code>
            .
          </p>
          <pre className="overflow-x-auto rounded-xl border border-white/10 bg-black/50 p-4 text-xs leading-relaxed text-hpe-white">
            {`NEXT_PUBLIC_SUPABASE_URL=...
NEXT_PUBLIC_SUPABASE_ANON_KEY=...
SUPABASE_SERVICE_ROLE_KEY=...`}
          </pre>
          <p className="text-xs text-hpe-muted">
            O passo a passo completo está no <strong>README.md</strong> do projeto.
          </p>
        </div>
      </div>
    </div>
  );
}
