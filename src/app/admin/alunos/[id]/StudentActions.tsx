'use client';

import { useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { Archive, KeyRound, RotateCcw } from 'lucide-react';
import { useToast } from '@/components/ui/Toast';
import { inviteStudent, setStudentStatus } from '../actions';
import type { ContractStatus } from '@/lib/supabase/database.types';

export function StudentActions({
  studentId,
  status,
  hasAccess,
  hasEmail,
}: {
  studentId: string;
  status: ContractStatus;
  hasAccess: boolean;
  hasEmail: boolean;
}) {
  const router = useRouter();
  const toast = useToast();
  const [isPending, startTransition] = useTransition();

  function invite() {
    startTransition(async () => {
      const result = await inviteStudent(studentId);
      if (result.ok) {
        toast.success(result.message ?? 'Convite enviado.');
        router.refresh();
      } else {
        toast.error(result.message ?? 'Não foi possível enviar o convite.');
      }
    });
  }

  function changeStatus(next: ContractStatus) {
    startTransition(async () => {
      const result = await setStudentStatus(studentId, next);
      if (result.ok) {
        toast.success(
          next === 'archived' ? 'Aluno arquivado.' : 'Aluno reativado.',
        );
        router.refresh();
      } else {
        toast.error(result.message ?? 'Não foi possível alterar a situação.');
      }
    });
  }

  return (
    <>
      {!hasAccess ? (
        <button
          type="button"
          onClick={invite}
          disabled={isPending || !hasEmail}
          title={hasEmail ? undefined : 'Cadastre o e-mail do aluno primeiro.'}
          className="hpe-btn-ghost hpe-btn-sm"
        >
          <KeyRound className="h-4 w-4" />
          Enviar convite de acesso
        </button>
      ) : null}

      {status === 'archived' ? (
        <button
          type="button"
          onClick={() => changeStatus('active')}
          disabled={isPending}
          className="hpe-btn-ghost hpe-btn-sm"
        >
          <RotateCcw className="h-4 w-4" />
          Reativar
        </button>
      ) : (
        <button
          type="button"
          onClick={() => changeStatus('archived')}
          disabled={isPending}
          className="hpe-btn-subtle hpe-btn-sm"
        >
          <Archive className="h-4 w-4" />
          Arquivar
        </button>
      )}
    </>
  );
}
