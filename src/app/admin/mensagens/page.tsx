import { PageHeader } from '@/components/dashboard/PageHeader';
import { MessagesClient, type MessageRow } from './MessagesClient';
import { createClient } from '@/lib/supabase/server';
import { integrationsStatus } from '@/lib/integrations';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Mensagens' };

export default async function MessagesPage() {
  const supabase = createClient();

  const [messagesResult, studentsResult] = await Promise.all([
    supabase
      .from('messages')
      .select('id, subject, body, created_at, students(full_name)')
      .order('created_at', { ascending: false })
      .limit(50),
    supabase
      .from('students')
      .select('id, full_name')
      .in('contract_status', ['active', 'paused'])
      .order('full_name'),
  ]);

  const messages: MessageRow[] = (messagesResult.data ?? []).map((row) => {
    const student = row.students as unknown as { full_name: string } | null;
    return {
      id: row.id,
      subject: row.subject,
      body: row.body,
      created_at: row.created_at,
      student_name: student?.full_name ?? null,
    };
  });

  return (
    <>
      <PageHeader
        title="Mensagens"
        description="Avisos para os alunos, com histórico e notificação dentro da plataforma."
      />

      <MessagesClient
        messages={messages}
        students={studentsResult.data ?? []}
        integrationsReady={integrationsStatus()}
      />
    </>
  );
}
