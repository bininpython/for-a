import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { PageHeader } from '@/components/dashboard/PageHeader';
import { NewPlanForm } from './NewPlanForm';
import { createClient } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Nova ficha' };

export default async function NewPlanPage({
  searchParams,
}: {
  searchParams: { aluno?: string };
}) {
  const supabase = createClient();
  const { data: students } = await supabase
    .from('students')
    .select('id, full_name')
    .in('contract_status', ['active', 'paused'])
    .order('full_name');

  return (
    <div className="mx-auto max-w-3xl">
      <Link
        href="/admin/fichas"
        className="mb-6 inline-flex items-center gap-2 text-sm text-hpe-muted transition-colors hover:text-hpe-white"
      >
        <ArrowLeft className="h-4 w-4" />
        Voltar para fichas
      </Link>

      <PageHeader
        title="Nova ficha"
        description="Defina a divisão e, em seguida, monte os exercícios de cada dia."
      />

      <NewPlanForm students={students ?? []} initialStudentId={searchParams.aluno} />
    </div>
  );
}
