import { PageHeader } from '@/components/dashboard/PageHeader';
import { ServicesClient } from './ServicesClient';
import { createClient } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Treinamentos' };

export default async function ServicesAdminPage() {
  const supabase = createClient();
  const { data } = await supabase.from('services').select('*').order('sort_order');

  return (
    <>
      <PageHeader
        title="Tipos de treinamento"
        description="Estes são os serviços exibidos no site e oferecidos na tela de agendamento."
      />
      <ServicesClient services={data ?? []} />
    </>
  );
}
