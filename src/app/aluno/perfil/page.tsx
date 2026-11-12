import { PageHeader } from '@/components/dashboard/PageHeader';
import { StudentProfileForm } from './StudentProfileForm';
import { requireStudent } from '@/lib/auth';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Meu perfil' };

export default async function StudentProfilePage() {
  const { student, email } = await requireStudent();

  return (
    <>
      <PageHeader
        title="Meu perfil"
        description="Seus dados de contato e preferências de privacidade."
      />
      <StudentProfileForm student={student} email={email} />
    </>
  );
}
