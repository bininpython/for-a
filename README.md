# HPE — PATRICK PERSONAL

Plataforma de treinamento e gestão de personal trainer: site institucional com
experiência 3D, agendamento inteligente, painel administrativo completo e área
exclusiva do aluno.

Atendimento presencial na **ALP FIT — Coronel Fabriciano/MG**.

---

## Sumário

- [Stack](#stack)
- [O que já está pronto](#o-que-já-está-pronto)
- [Instalação](#instalação)
- [Configurando o Supabase](#configurando-o-supabase)
- [Primeiro acesso](#primeiro-acesso)
- [Deploy na Vercel](#deploy-na-vercel)
- [Integrações opcionais](#integrações-opcionais)
- [Estrutura do projeto](#estrutura-do-projeto)
- [Modelo de dados](#modelo-de-dados)
- [Segurança e LGPD](#segurança-e-lgpd)
- [Manutenção](#manutenção)

---

## Stack

| Camada | Tecnologia |
| --- | --- |
| Framework | Next.js 14 (App Router) |
| Linguagem | TypeScript (modo estrito) |
| Estilo | Tailwind CSS com a paleta HPE |
| Animação | Framer Motion |
| 3D | Three.js + React Three Fiber + Drei |
| Banco, auth e storage | Supabase (PostgreSQL) |
| Gráficos | Recharts |
| Ícones | Lucide React |
| Deploy | Vercel |

---

## O que já está pronto

**Site institucional**
Hero cinematográfico com composição 3D (halter e anilhas, iluminação laranja da
marca, reação ao mouse) e fallback automático para dispositivos sem WebGL ou com
`prefers-reduced-motion`. Seções de apresentação do personal, serviços,
disponibilidade real, localização com mapa, depoimentos e CTA. Política de
privacidade e termos de uso escritos para o contexto do projeto.

**Agendamento**
O aluno escolhe o tipo de treinamento, a data e o horário. A disponibilidade é
calculada no banco (`available_slots`) a partir das janelas semanais, menos
bloqueios e menos atendimentos já ocupados. A gravação passa por
`book_appointment`, que revalida tudo no servidor; uma constraint `EXCLUDE` no
PostgreSQL garante que dois pedidos simultâneos nunca ocupem o mesmo horário.

**Painel do personal**
Visão geral com indicadores reais e gráficos; gestão de alunos com perfil
individual em seis abas; agenda com confirmação, conclusão, falta, cancelamento,
reagendamento, encaixes manuais e bloqueios; fichas de treino com divisões A/B
até A/B/C/D/E, modelos reutilizáveis e publicação; avaliações físicas com medidas
corporais; financeiro com receitas, despesas e inadimplência; mensalidades com
geração em lote; relatórios em CSV; avisos para os alunos; configuração de agenda
e perfil profissional.

**Área do aluno**
Dashboard com próximo treino, frequência e situação da mensalidade; ficha
publicada; execução guiada do treino com registro de séries, cargas e cronômetro
de descanso; agendamentos com cancelamento dentro do prazo; evolução em gráficos;
avaliações com fotos privadas; financeiro; perfil com controle de consentimento.

**Decisões deliberadas**

- Nenhuma informação profissional sobre o Patrick é inventada. Biografia,
  metodologia, experiência, especialidades e certificações nascem vazias e são
  preenchidas por ele em **Painel → Meu perfil**.
- Nenhum gráfico usa dado fictício. Sem dados, a tela mostra um estado vazio
  explicando o que falta.
- Pagamento só fica `paid` com data de confirmação — há uma constraint no banco
  que recusa o contrário.
- Integrações não configuradas não simulam envio: a notificação fica registrada
  como `skipped`.

---

## Instalação

Requer **Node.js 18.17+** (recomendado 20 LTS).

```bash
git clone https://github.com/bininpython/for-a.git
cd for-a
npm install
cp .env.example .env.local   # preencha com as chaves do seu projeto Supabase
npm run dev
```

A aplicação sobe em <http://localhost:3000>.

Sem as variáveis do Supabase o site abre normalmente, mas as telas que dependem
de dados exibem um aviso de configuração em vez de conteúdo inventado.

### Scripts

| Comando | O que faz |
| --- | --- |
| `npm run dev` | Servidor de desenvolvimento |
| `npm run build` | Build de produção |
| `npm run start` | Servir o build |
| `npm run lint` | ESLint |
| `npm run typecheck` | Verificação de tipos |
| `npm run db:types` | Regera `src/lib/supabase/database.types.ts` do banco |

---

## Configurando o Supabase

### 1. Criar o projeto

Em <https://supabase.com>, crie um projeto. Anote a URL e as chaves em
**Project Settings → API**.

### 2. Variáveis de ambiente

Em `.env.local`:

```bash
NEXT_PUBLIC_SUPABASE_URL=https://xxxxxxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOi...
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOi...
NEXT_PUBLIC_SITE_URL=http://localhost:3000
```

> `SUPABASE_SERVICE_ROLE_KEY` **nunca** leva o prefixo `NEXT_PUBLIC_`. Ela é
> usada só no servidor, para convidar alunos por e-mail.

### 3. Aplicar as migrations

As migrations estão em `supabase/migrations/`, na ordem em que devem rodar:

| Arquivo | Conteúdo |
| --- | --- |
| `…000000_schema.sql` | Tabelas, tipos, índices e a constraint anticonflito |
| `…000100_functions.sql` | Funções de disponibilidade, agendamento e indicadores |
| `…000200_rls.sql` | Row Level Security de todas as tabelas |
| `…000300_storage.sql` | Buckets e políticas de arquivos |
| `…000400_seed_catalog.sql` | Os 7 serviços e uma grade de horários padrão |

As migrations foram executadas e testadas contra um PostgreSQL 16 real: 20
tabelas, 43 políticas RLS (todas as tabelas com RLS ativo), 3 buckets, 7
serviços e 11 janelas de horário. Os GRANTs de `anon` e `authenticated` estão
explícitos no arquivo de RLS, para o schema funcionar igual em qualquer projeto
ou restauração de backup.

**Opção A — SQL Editor:** abra cada arquivo, cole no SQL Editor do Supabase e
execute na ordem acima.

**Opção B — CLI:**

```bash
npm i -g supabase
supabase link --project-ref <seu-project-ref>
supabase db push
```

### 4. Definir o e-mail do administrador

Esta configuração decide qual conta vira administradora. Rode no SQL Editor,
trocando pelo e-mail real do Patrick:

```sql
alter database postgres set app.admin_email = 'patrick@exemplo.com';
```

Depois recarregue a configuração:

```sql
select pg_reload_conf();
```

Qualquer outra conta criada entra como **aluno** — nunca como administrador.

### 5. Configurar o Auth

Em **Authentication → URL Configuration**:

- **Site URL:** a URL do seu site (`http://localhost:3000` em desenvolvimento).
- **Redirect URLs:** acrescente `http://localhost:3000/nova-senha` e, em
  produção, `https://seu-dominio.com/nova-senha`.

Em **Authentication → Providers → Email**, mantenha o provedor de e-mail/senha
habilitado. Desabilite o cadastro público se quiser que só o Patrick crie contas.

---

## Primeiro acesso

1. Em **Authentication → Users → Add user**, crie o usuário com o mesmo e-mail
   definido em `app.admin_email` e uma senha temporária.
2. Entre em `/entrar` com essa conta. O trigger `handle_new_user` já criou o
   perfil com `role = 'admin'`.
3. Vá em **Painel → Meu perfil** e preencha nome profissional, biografia,
   metodologia, especialidades, certificações, contatos, endereço da academia e
   envie a fotografia. Esse conteúdo aparece no site imediatamente.
4. Em **Configurações**, ajuste a grade de horários e as regras de agendamento.
5. Em **Alunos → Novo aluno**, cadastre o primeiro aluno e use
   **Enviar convite de acesso**. O aluno recebe um e-mail, define a própria senha
   e a conta é vinculada ao cadastro automaticamente.

> Se o aluno criar conta com um e-mail diferente do cadastrado, ele cai em
> `/sem-vinculo` com a instrução do que fazer. Basta o Patrick registrar o e-mail
> correto no cadastro para o vínculo acontecer.

### Se a conta do Patrick entrou como aluno

Acontece quando o usuário é criado **antes** de `app.admin_email` ser definido.
Promova pelo SQL Editor:

```sql
update public.profiles set role = 'admin' where email = 'patrick@exemplo.com';
```

Funciona porque no SQL Editor não há sessão de usuário. Um aluno logado que
tente o mesmo comando recebe `Alteração de permissão não autorizada.` — o
trigger `guard_profile_role` bloqueia a escalada de privilégio.

---

## Deploy na Vercel

1. Importe o repositório em <https://vercel.com/new>.
2. Framework: **Next.js** (detectado automaticamente).
3. Em **Environment Variables**, adicione:

   | Nome | Ambiente |
   | --- | --- |
   | `NEXT_PUBLIC_SUPABASE_URL` | Production, Preview, Development |
   | `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Production, Preview, Development |
   | `SUPABASE_SERVICE_ROLE_KEY` | Production, Preview |
   | `NEXT_PUBLIC_SITE_URL` | Production (a URL final do site) |

4. Faça o deploy.
5. Volte ao Supabase e atualize **Site URL** e **Redirect URLs** com o domínio
   de produção.

### Domínio próprio

Em **Vercel → Settings → Domains**, adicione o domínio e aponte o DNS conforme
as instruções exibidas. Atualize `NEXT_PUBLIC_SITE_URL` e as URLs do Supabase
depois que o domínio propagar.

---

## Integrações opcionais

A estrutura está pronta em `src/lib/integrations.ts`. Enquanto as credenciais
não existirem, nada é enviado e nada é marcado como enviado.

**WhatsApp (Cloud API)**

```bash
WHATSAPP_PHONE_NUMBER_ID=...
WHATSAPP_ACCESS_TOKEN=...
```

Crie um app no [Meta for Developers](https://developers.facebook.com), adicione o
produto WhatsApp, pegue o *Phone Number ID* e gere um token permanente.

**E-mail (Resend)**

```bash
RESEND_API_KEY=...
RESEND_FROM_EMAIL=contato@seu-dominio.com
```

Crie a conta em <https://resend.com>, verifique o domínio e gere a chave.

**Pagamentos**

A tabela `payments` já guarda `method`, `paid_at` e `status`, preparada para Pix
ou gateway. Hoje a baixa é manual e exige confirmação real do recebimento.

---

## Estrutura do projeto

```
src/
├── app/
│   ├── (site)/              # Site institucional e agendamento
│   ├── (auth)/              # Login, recuperação de senha, conta sem vínculo
│   ├── admin/               # Painel do personal
│   ├── aluno/               # Área exclusiva do aluno
│   ├── api/relatorios/      # Exportação CSV
│   └── auth/signout/
├── components/
│   ├── brand/               # Logo e marca
│   ├── site/                # Seções do site institucional
│   ├── three/               # Cena 3D do hero
│   ├── dashboard/           # Barra lateral e cabeçalho de página
│   ├── booking/             # Calendário
│   ├── charts/              # Gráficos Recharts com a identidade HPE
│   ├── upload/              # Envio de imagens para o Storage
│   └── ui/                  # Botões, modais, badges, toasts, campos
├── lib/
│   ├── supabase/            # Clientes, tipos e variáveis de ambiente
│   ├── auth.ts              # Sessão e guardas de permissão
│   ├── integrations.ts      # WhatsApp e e-mail
│   ├── labels.ts            # Rótulos em português
│   └── utils.ts             # Formatação de data, moeda e telefone
└── middleware.ts            # Renovação de sessão e proteção de rotas
```

Cada módulo do painel tem o próprio `actions.ts` com Server Actions. **Toda ação
verifica a permissão no servidor** com `is_admin()`, mesmo que a rota já esteja
protegida pelo middleware.

---

## Modelo de dados

20 tabelas em `public`:

`profiles` · `personal_settings` · `services` · `students` · `availability` ·
`blocked_times` · `appointments` · `training_plans` · `training_days` ·
`exercises` · `exercise_logs` · `physical_assessments` · `body_measurements` ·
`progress_photos` · `subscriptions` · `payments` · `expenses` · `notifications` ·
`messages` · `testimonials`

### Funções

| Função | Para que serve |
| --- | --- |
| `available_slots(data, serviço)` | Horários livres de um dia |
| `book_appointment(...)` | Agenda com revalidação e proteção de conflito |
| `cancel_appointment(...)` | Cancela respeitando o prazo mínimo |
| `admin_overview()` | Todos os indicadores do painel numa consulta |
| `refresh_overdue_payments()` | Marca mensalidades vencidas como atrasadas |
| `is_admin()` / `current_student_id()` | Permissões, usadas nas políticas RLS |

### Proteção contra conflito de agenda

```sql
alter table public.appointments
  add constraint appointments_no_overlap
  exclude using gist (tstzrange(starts_at, ends_at) with &&)
  where (status in ('requested', 'confirmed', 'completed'));
```

Se dois alunos pedirem o mesmo horário ao mesmo tempo, o segundo recebe
`Este horário acabou de ser ocupado. Escolha outro.` — a garantia é do banco,
não da interface.

---

## Segurança e LGPD

- **RLS em todas as tabelas** com dados privados.
- O personal acessa os dados dos seus alunos; cada aluno acessa apenas os
  próprios. Nenhum aluno enxerga dados, fotos ou valores de outro.
- Fotografias de evolução ficam em bucket **privado**, servidas por links
  assinados temporários.
- A chave de serviço nunca chega ao navegador.
- A coluna `role` não pode ser alterada pelo próprio usuário — há um trigger que
  bloqueia a escalada de privilégio.
- Consentimento de dados e de imagem é registrado com data e pode ser revogado
  pelo aluno em **Meu perfil**.
- Depoimentos só podem ser publicados com consentimento registrado — há uma
  constraint que recusa o contrário.

---

## Manutenção

**Regerar os tipos depois de mudar o schema**

```bash
supabase link --project-ref <ref>
npm run db:types
```

**Marcar mensalidades vencidas automaticamente**

A função já é chamada ao abrir o painel e o financeiro. Para rodar sozinha, crie
um cron no Supabase (**Database → Cron Jobs**):

```sql
select cron.schedule(
  'marcar-mensalidades-atrasadas',
  '0 6 * * *',
  $$ select public.refresh_overdue_payments(); $$
);
```

**Backup**

O Supabase faz backup automático nos planos pagos. Para uma cópia manual:

```bash
supabase db dump -f backup.sql
```

**Desempenho do 3D**

A cena usa geometria primitiva, sem modelos externos para baixar, `dpr` limitado
a 1.75 e sombras desativadas. Para reduzir ainda mais o custo em dispositivos
fracos, ajuste `dpr` em `src/components/three/HeroScene.tsx`.

---

Desenvolvido para **HPE — Patrick Personal** · ALP FIT, Coronel Fabriciano/MG.
