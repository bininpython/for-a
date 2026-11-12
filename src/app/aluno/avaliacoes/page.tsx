import { Ruler, ShieldCheck } from 'lucide-react';
import { PageHeader } from '@/components/dashboard/PageHeader';
import { EmptyState } from '@/components/ui/EmptyState';
import { ProgressPhotos } from './ProgressPhotos';
import { requireStudent } from '@/lib/auth';
import { createClient } from '@/lib/supabase/server';
import { formatDate } from '@/lib/utils';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Minhas avaliações' };

export default async function StudentAssessmentsPage() {
  const { student } = await requireStudent();
  const supabase = createClient();

  const [assessmentsResult, photosResult] = await Promise.all([
    supabase
      .from('physical_assessments')
      .select('*, body_measurements(site, value_cm)')
      .eq('student_id', student.id)
      .order('assessed_on', { ascending: false }),
    supabase
      .from('progress_photos')
      .select('*')
      .eq('student_id', student.id)
      .order('taken_on', { ascending: false })
      .limit(24),
  ]);

  const assessments = assessmentsResult.data ?? [];
  const photos = photosResult.data ?? [];

  // Links temporários: o bucket é privado e não aceita acesso direto.
  const signedPhotos = await Promise.all(
    photos.map(async (photo) => {
      const { data } = await supabase.storage
        .from('progress-photos')
        .createSignedUrl(photo.storage_path, 60 * 60);
      return {
        id: photo.id,
        url: data?.signedUrl ?? null,
        angle: photo.angle,
        takenOn: photo.taken_on,
      };
    }),
  );

  return (
    <>
      <PageHeader
        title="Minhas avaliações"
        description="Histórico completo das medições feitas pelo Patrick."
      />

      {assessments.length === 0 ? (
        <EmptyState
          icon={Ruler}
          title="Nenhuma avaliação registrada"
          description="Suas avaliações físicas aparecem aqui assim que forem feitas."
        />
      ) : (
        <div className="space-y-4">
          {assessments.map((assessment, position) => {
            const previous = assessments[position + 1];
            const measurements = (assessment.body_measurements ?? []) as unknown as {
              site: string;
              value_cm: number;
            }[];

            return (
              <article key={assessment.id} className="hpe-card p-5 sm:p-6">
                <div className="flex flex-wrap items-baseline justify-between gap-3">
                  <h2 className="font-display text-base font-bold uppercase tracking-wide">
                    {formatDate(assessment.assessed_on, {
                      day: '2-digit',
                      month: 'long',
                      year: 'numeric',
                    })}
                  </h2>
                  {position === 0 ? (
                    <span className="text-xs uppercase tracking-wider text-hpe-orange">
                      Mais recente
                    </span>
                  ) : null}
                </div>

                <div className="mt-4 grid gap-3 sm:grid-cols-3 lg:grid-cols-5">
                  <Metric
                    label="Peso"
                    value={assessment.weight_kg}
                    previous={previous?.weight_kg}
                    unit=" kg"
                  />
                  <Metric label="Altura" value={assessment.height_cm} unit=" cm" />
                  <Metric
                    label="% Gordura"
                    value={assessment.body_fat_pct}
                    previous={previous?.body_fat_pct}
                    unit="%"
                  />
                  <Metric
                    label="Massa magra"
                    value={assessment.lean_mass_kg}
                    previous={previous?.lean_mass_kg}
                    unit=" kg"
                  />
                  <Metric
                    label="FC repouso"
                    value={assessment.resting_hr}
                    previous={previous?.resting_hr}
                    unit=" bpm"
                  />
                </div>

                {measurements.length ? (
                  <div className="mt-5 border-t border-white/[0.06] pt-4">
                    <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-hpe-muted">
                      Medidas corporais
                    </p>
                    <div className="flex flex-wrap gap-2">
                      {measurements.map((m) => (
                        <span
                          key={m.site}
                          className="rounded-lg border border-white/10 bg-white/[0.02] px-3 py-1.5 text-xs"
                        >
                          {m.site}:{' '}
                          <strong className="tabular-nums">{m.value_cm} cm</strong>
                        </span>
                      ))}
                    </div>
                  </div>
                ) : null}

                {assessment.notes ? (
                  <p className="mt-4 border-t border-white/[0.06] pt-4 text-sm leading-relaxed text-hpe-muted">
                    {assessment.notes}
                  </p>
                ) : null}
              </article>
            );
          })}
        </div>
      )}

      {signedPhotos.length > 0 ? (
        <section className="mt-8">
          <h2 className="mb-2 font-display text-base font-bold uppercase tracking-wide">
            Fotografias de evolução
          </h2>
          <p className="mb-4 flex items-start gap-2 text-xs leading-relaxed text-hpe-muted">
            <ShieldCheck className="mt-0.5 h-3.5 w-3.5 shrink-0 text-hpe-orange" />
            Estas imagens ficam em armazenamento privado. Só você e o Patrick têm
            acesso, por links temporários gerados a cada visita.
          </p>
          <ProgressPhotos photos={signedPhotos} />
        </section>
      ) : null}
    </>
  );
}

function Metric({
  label,
  value,
  previous,
  unit,
}: {
  label: string;
  value: number | null;
  previous?: number | null;
  unit: string;
}) {
  const delta =
    value !== null && previous !== null && previous !== undefined ? value - previous : null;

  return (
    <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-3">
      <p className="text-[10px] font-semibold uppercase tracking-wider text-hpe-muted">
        {label}
      </p>
      <p className="mt-1 font-display text-lg font-bold tabular-nums">
        {value === null ? '—' : `${value}${unit}`}
      </p>
      {delta !== null && delta !== 0 ? (
        <p
          className={`mt-0.5 text-[11px] tabular-nums ${delta > 0 ? 'text-emerald-400' : 'text-hpe-orange'}`}
        >
          {delta > 0 ? '+' : ''}
          {delta.toFixed(1)} vs. anterior
        </p>
      ) : null}
    </div>
  );
}
