import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ArrowLeft } from 'lucide-react';
import { PageHeader } from '@/components/dashboard/PageHeader';
import { StudentForm } from '../../StudentForm';
import { createClient } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Editar aluno' };

export default async function EditStudentPage({ params }: { params: { id: string } }) {
  const supabase = createClient();
  const { data: student } = await supabase
    .from('students')
    .select('*')
    .eq('id', params.id)
    .maybeSingle();

  if (!student) notFound();

  return (
    <div className="mx-auto max-w-4xl">
      <Link
        href={`/admin/alunos/${student.id}`}
        className="mb-6 inline-flex items-center gap-2 text-sm text-hpe-muted transition-colors hover:text-hpe-white"
      >
        <ArrowLeft className="h-4 w-4" />
        Voltar para o perfil
      </Link>

      <PageHeader title="Editar aluno" description={student.full_name} />

      <StudentForm student={student} />
    </div>
  );
}
