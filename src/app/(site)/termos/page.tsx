import type { Metadata } from 'next';
import { getPublicContent } from '@/lib/data/public';

export const metadata: Metadata = {
  title: 'Termos de uso',
  description: 'Condições de uso da plataforma HPE — Patrick Personal.',
};

export default async function TermsPage() {
  const { settings } = await getPublicContent();
  const minHours = settings?.min_hours_to_cancel ?? 12;

  return (
    <article className="mx-auto max-w-3xl px-5 pb-24 pt-36 lg:px-8">
      <p className="hpe-eyebrow">Documento legal</p>
      <h1 className="hpe-section-title mt-4">Termos de uso</h1>

      <div className="mt-10 space-y-8 leading-relaxed text-hpe-muted [&_h2]:hpe-display [&_h2]:mb-3 [&_h2]:mt-10 [&_h2]:text-xl [&_h2]:text-hpe-white [&_li]:mb-2 [&_strong]:text-hpe-white [&_ul]:list-disc [&_ul]:space-y-1 [&_ul]:pl-5">
        <section>
          <h2>Objeto</h2>
          <p>
            Esta plataforma é o canal de relacionamento entre{' '}
            <strong>{settings?.professional_name ?? 'Patrick Personal'}</strong> e seus
            alunos. Por meio dela são feitos agendamentos de treinos, consulta de fichas
            de treinamento, registro de execução, acompanhamento de evolução física e
            consulta da situação financeira.
          </p>
        </section>

        <section>
          <h2>Conta de acesso</h2>
          <ul>
            <li>
              As contas de aluno são criadas pelo personal trainer a partir do cadastro
              do aluno. Não há cadastro público aberto.
            </li>
            <li>
              As credenciais são pessoais e não devem ser compartilhadas. O titular é
              responsável pelas ações realizadas com a sua conta.
            </li>
            <li>
              Suspeita de acesso indevido deve ser comunicada imediatamente ao personal.
            </li>
          </ul>
        </section>

        <section>
          <h2>Agendamentos, cancelamentos e faltas</h2>
          <ul>
            <li>
              Os horários exibidos refletem a disponibilidade real da agenda no momento
              da consulta. A confirmação só se completa quando o sistema registra o
              agendamento.
            </li>
            <li>
              Atendimentos individuais não admitem dois alunos no mesmo horário.
            </li>
            <li>
              Cancelamentos pelo aluno devem ser feitos com pelo menos{' '}
              <strong>{minHours} horas</strong> de antecedência. Dentro desse prazo, o
              cancelamento passa a depender de contato direto com o personal.
            </li>
            <li>
              O não comparecimento sem aviso é registrado como falta e afeta a taxa de
              frequência.
            </li>
          </ul>
        </section>

        <section>
          <h2>Orientação de treino e responsabilidade</h2>
          <ul>
            <li>
              As fichas de treinamento são prescritas individualmente e não devem ser
              compartilhadas ou executadas por terceiros.
            </li>
            <li>
              O aluno se compromete a informar condições de saúde, lesões, restrições
              médicas e uso de medicamentos que possam afetar a prática de exercícios.
            </li>
            <li>
              A plataforma não substitui avaliação ou acompanhamento médico. Em caso de
              dor, desconforto ou sintoma incomum, o treino deve ser interrompido e um
              profissional de saúde consultado.
            </li>
          </ul>
        </section>

        <section>
          <h2>Mensalidades</h2>
          <p>
            Os valores, vencimentos e a situação de cada mensalidade ficam visíveis na
            área do aluno. Pagamentos só são marcados como recebidos após confirmação
            real pelo personal — a plataforma não processa cobranças automaticamente.
          </p>
        </section>

        <section>
          <h2>Imagens de evolução</h2>
          <p>
            O registro fotográfico de evolução é opcional e depende de autorização
            expressa do aluno. As imagens ficam em armazenamento privado, visíveis
            apenas ao próprio aluno e ao personal, e a publicação em qualquer canal
            exige autorização específica e separada.
          </p>
        </section>

        <section>
          <h2>Uso adequado</h2>
          <p>
            É vedado tentar acessar dados de outros usuários, burlar os controles de
            permissão, automatizar requisições de forma abusiva ou interferir no
            funcionamento da plataforma. O descumprimento pode levar à suspensão do
            acesso.
          </p>
        </section>

        <section>
          <h2>Alterações</h2>
          <p>
            Estes termos podem ser atualizados. O uso continuado da plataforma após a
            publicação de alterações implica concordância com a versão vigente.
          </p>
        </section>
      </div>
    </article>
  );
}
