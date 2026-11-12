import type { Metadata } from 'next';
import { BookingFlow } from './BookingFlow';
import { SetupNotice } from '@/components/ui/SetupNotice';
import { EmptyState } from '@/components/ui/EmptyState';
import { getPublicContent } from '@/lib/data/public';
import { getSession } from '@/lib/auth';

export const metadata: Metadata = {
  title: 'Agendar treino',
  description:
    'Escolha o tipo de treinamento, a data e o horário. Disponibilidade em tempo real.',
};

export const dynamic = 'force-dynamic';

export default async function BookingPage({
  searchParams,
}: {
  searchParams: { servico?: string; data?: string; hora?: string };
}) {
  const { configured, settings, services, availability } = await getPublicContent();
  const session = await getSession();

  // Dias da semana sem nenhuma janela de atendimento ficam desabilitados
  // no calendário, evitando cliques que nunca retornariam horários.
  const weekdaysWithService = new Set(availability.map((w) => w.weekday));
  const weekdaysWithoutService = [0, 1, 2, 3, 4, 5, 6].filter(
    (weekday) => !weekdaysWithService.has(weekday),
  );

  return (
    <div className="mx-auto max-w-7xl px-5 pb-24 pt-32 lg:px-8">
      <header className="max-w-2xl">
        <p className="hpe-eyebrow">Agendamento</p>
        <h1 className="hpe-section-title mt-4">Marque seu treino</h1>
        <p className="mt-5 text-pretty leading-relaxed text-hpe-muted">
          Os horários exibidos são os que estão realmente livres na agenda do Patrick.
          A vaga só é sua quando o servidor confirma — nada de dois alunos no mesmo
          horário.
        </p>
      </header>

      <div className="mt-14">
        {!configured ? (
          <SetupNotice context="O agendamento consulta a agenda diretamente no banco de dados." />
        ) : services.length === 0 ? (
          <EmptyState
            title="Nenhum serviço disponível para agendamento"
            description="Os tipos de treinamento são cadastrados no painel administrativo."
          />
        ) : (
          <BookingFlow
            services={services.filter((s) => s.bookable)}
            signedIn={Boolean(session)}
            isAdmin={session?.profile.role === 'admin'}
            horizonDays={settings?.booking_horizon_days ?? 30}
            whatsapp={settings?.whatsapp ?? null}
            initialServiceSlug={searchParams.servico}
            initialDate={searchParams.data}
            initialSlot={searchParams.hora}
            weekdaysWithoutService={weekdaysWithoutService}
          />
        )}
      </div>
    </div>
  );
}
