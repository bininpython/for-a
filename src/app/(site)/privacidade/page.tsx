import type { Metadata } from 'next';
import { getPublicContent } from '@/lib/data/public';

export const metadata: Metadata = {
  title: 'Política de privacidade',
  description:
    'Como a plataforma HPE — Patrick Personal trata dados pessoais, em conformidade com a LGPD.',
};

export default async function PrivacyPage() {
  const { settings } = await getPublicContent();
  const contact = settings?.public_email ?? settings?.whatsapp ?? null;

  return (
    <article className="mx-auto max-w-3xl px-5 pb-24 pt-36 lg:px-8">
      <p className="hpe-eyebrow">Documento legal</p>
      <h1 className="hpe-section-title mt-4">Política de privacidade</h1>

      <div className="mt-10 space-y-8 leading-relaxed text-hpe-muted [&_h2]:hpe-display [&_h2]:mb-3 [&_h2]:mt-10 [&_h2]:text-xl [&_h2]:text-hpe-white [&_li]:mb-2 [&_strong]:text-hpe-white [&_ul]:list-disc [&_ul]:space-y-1 [&_ul]:pl-5">
        <p>
          Esta política descreve como os dados pessoais tratados nesta plataforma são
          coletados, usados e protegidos, em conformidade com a Lei Geral de Proteção
          de Dados Pessoais (Lei nº 13.709/2018 — LGPD).
        </p>

        <section>
          <h2>Quem é o controlador</h2>
          <p>
            O controlador dos dados é o profissional responsável pelo atendimento,{' '}
            <strong>{settings?.professional_name ?? 'Patrick Personal'}</strong>, que
            utiliza esta plataforma para gerir os treinos, a agenda e o acompanhamento
            dos seus alunos.
          </p>
        </section>

        <section>
          <h2>Quais dados são tratados</h2>
          <ul>
            <li>
              <strong>Cadastrais:</strong> nome, data de nascimento, telefone, e-mail,
              CPF (opcional) e contato de emergência.
            </li>
            <li>
              <strong>De saúde e desempenho:</strong> objetivos, nível de treinamento,
              peso, altura, medidas corporais, percentual de gordura quando medido,
              cargas e frequência de treino.
            </li>
            <li>
              <strong>Imagens:</strong> fotografia de perfil e fotografias de evolução
              física, quando o aluno autoriza expressamente o registro.
            </li>
            <li>
              <strong>Financeiros:</strong> plano contratado, valores, vencimentos e
              histórico de pagamentos.
            </li>
            <li>
              <strong>De acesso:</strong> e-mail e credenciais de autenticação,
              gerenciados pelo provedor de identidade da plataforma.
            </li>
          </ul>
        </section>

        <section>
          <h2>Para que os dados são usados</h2>
          <ul>
            <li>Prescrever e acompanhar os treinos de forma individualizada.</li>
            <li>Organizar a agenda de atendimentos e evitar conflitos de horário.</li>
            <li>Registrar avaliações físicas e demonstrar a evolução ao longo do tempo.</li>
            <li>Controlar mensalidades e a situação contratual.</li>
            <li>Enviar avisos sobre treinos, horários e pagamentos.</li>
          </ul>
          <p>
            O tratamento se dá para a execução do contrato de prestação de serviços e,
            no caso de dados de saúde e de imagem, mediante consentimento específico do
            titular, que pode ser revogado a qualquer momento.
          </p>
        </section>

        <section>
          <h2>Quem tem acesso</h2>
          <p>
            O acesso é restrito por perfil, com regras aplicadas diretamente no banco de
            dados (<em>Row Level Security</em>):
          </p>
          <ul>
            <li>
              O personal trainer acessa os dados dos seus próprios alunos, para fins de
              acompanhamento.
            </li>
            <li>
              Cada aluno acessa exclusivamente os seus próprios dados. Nenhum aluno
              consegue visualizar informações, fotografias ou dados financeiros de
              outro aluno.
            </li>
            <li>
              As fotografias de evolução ficam em armazenamento privado, acessível
              apenas por links temporários gerados para o próprio aluno e para o
              personal.
            </li>
          </ul>
          <p>
            Os dados não são vendidos nem compartilhados com terceiros para fins
            publicitários. Há compartilhamento apenas com os provedores de
            infraestrutura necessários ao funcionamento da plataforma (hospedagem,
            banco de dados e, quando configurados, serviços de envio de mensagens).
          </p>
        </section>

        <section>
          <h2>Por quanto tempo são guardados</h2>
          <p>
            Os dados são mantidos enquanto durar a relação de atendimento e pelos
            prazos legais aplicáveis após o encerramento. Um aluno pode ser arquivado
            sem perda do histórico, e pode solicitar a eliminação dos dados que não
            estejam sujeitos a guarda obrigatória.
          </p>
        </section>

        <section>
          <h2>Direitos do titular</h2>
          <p>
            A qualquer momento o titular pode solicitar confirmação da existência de
            tratamento, acesso, correção, anonimização, portabilidade, eliminação,
            informação sobre compartilhamentos e revogação do consentimento.
          </p>
          <p>
            Para exercer esses direitos, entre em contato
            {contact ? (
              <>
                {' '}
                por <strong>{contact}</strong>
              </>
            ) : (
              ' pelos canais de atendimento informados pelo personal'
            )}
            .
          </p>
        </section>

        <section>
          <h2>Segurança</h2>
          <p>
            A plataforma usa autenticação por sessão, controle de permissões por perfil
            no banco de dados, armazenamento privado para imagens sensíveis e tráfego
            criptografado. Chaves privadas de serviço não são expostas no navegador.
          </p>
        </section>

        <section>
          <h2>Atualizações</h2>
          <p>
            Esta política pode ser revisada. Alterações relevantes serão comunicadas
            pelos canais de atendimento ou dentro da área do aluno.
          </p>
        </section>
      </div>
    </article>
  );
}
