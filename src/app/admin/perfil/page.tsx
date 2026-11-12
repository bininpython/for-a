import { PageHeader } from '@/components/dashboard/PageHeader';
import { ProfileForm } from './ProfileForm';
import { createClient } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Meu perfil' };

export default async function PersonalProfilePage() {
  const supabase = createClient();
  const { data: settings } = await supabase
    .from('personal_settings')
    .select('*')
    .limit(1)
    .maybeSingle();

  return (
    <div className="mx-auto max-w-5xl">
      <PageHeader
        title="Meu perfil"
        description="Os dados profissionais e de contato exibidos no site institucional."
      />
      <ProfileForm settings={settings ?? null} />
    </div>
  );
}
