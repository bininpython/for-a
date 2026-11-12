import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { PageHeader } from '@/components/dashboard/PageHeader';
import { StudentForm } from '../StudentForm';

export const metadata = { title: 'Novo aluno' };

export default function NewStudentPage() {
  return (
    <div className="mx-auto max-w-4xl">
      <Link
        href="/admin/alunos"
        className="mb-6 inline-flex items-center gap-2 text-sm text-hpe-muted transition-colors hover:text-hpe-white"
      >
        <ArrowLeft className="h-4 w-4" />
        Voltar para alunos
      </Link>

      <PageHeader
        title="Novo aluno"
        description="Depois de salvar, você poderá enviar o convite de acesso, montar a ficha de treino e lançar as mensalidades."
      />

      <StudentForm />
    </div>
  );
}
