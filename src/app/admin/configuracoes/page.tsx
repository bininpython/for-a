import { PageHeader } from '@/components/dashboard/PageHeader';
import { SettingsClient } from './SettingsClient';
import { createClient } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Configurações' };

export default async function SettingsPage() {
  const supabase = createClient();

  const [availabilityResult, settingsResult] = await Promise.all([
    supabase.from('availability').select('*').order('weekday').order('start_time'),
    supabase.from('personal_settings').select('*').limit(1).maybeSingle(),
  ]);

  return (
    <>
      <PageHeader
        title="Configurações"
        description="Disponibilidade semanal e regras que o sistema aplica aos agendamentos dos alunos."
      />

      <SettingsClient
        availability={availabilityResult.data ?? []}
        settings={settingsResult.data ?? null}
      />
    </>
  );
}
