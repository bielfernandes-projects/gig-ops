# Documentação Oficial: Minha Banda (GigOps)

## 1. Visão Geral do Produto
O **Minha Banda** é um SaaS (Software as a Service) Mobile-First construído em formato PWA (Progressive Web App). Seu objetivo é centralizar a logística, a agenda e a gestão financeira de bandas e projetos musicais, eliminando a dependência de grupos de WhatsApp e planilhas de Excel.

## 2. Arquitetura Técnica (Tech Stack)
* **Front-end:** React + Next.js (App Router, Turbopack)
* **Linguagem:** TypeScript
* **Estilização:** Tailwind CSS + componentes Shadcn UI
* **Back-end & Banco de Dados:** Supabase (PostgreSQL, Auth, RLS)
* **Infraestrutura & Deploy:** Vercel
* **Integrações:** Sincronização iCal (Google/Apple Calendar), Web Push API (Notificações).

---

## 3. Níveis de Acesso (Multitenant & Roles)
O sistema possui uma arquitetura de permissões focada em privacidade, com duas "visões" completamente distintas do mesmo aplicativo. Toda leitura é escopada a um único "tenant admin id" (a conta que possui os dados).

**Resolução do tenant** (`lib/auth.ts:getUserInfo`):
- **Admin** → `tenantAdminId = userId` (dono do tenant).
- **Viewer** → `tenantAdminId = invitedBy` (UUID do admin que o convidou, gravado em `go_profiles.invited_by`).
- **Sem tenant** → queries retornam vazio (defesa em profundidade).

* **Administrador (Admin / Dono):**
  * Tem acesso irrestrito ao painel financeiro (receitas, despesas, lucro líquido).
  * Pode criar, editar e excluir Gigs (Shows), Projetos e Membros.
  * Define os cachês individuais e gerencia o pagamento (baixa financeira) da equipe e do equipamento de som.
  * Tem acesso ao campo de "Observações" dos shows (dados sensíveis/contratuais).
  * Visualiza e gerencia a seção "Escala de Músicos" na página de detalhes do show (adicionar, editar cachê, remover, confirmar pagamento).

* **Músico Convidado (Viewer):**
  * Visualiza apenas a própria realidade. Não vê os cachês dos colegas nem o lucro da empresa.
  * O painel financeiro exibe exclusivamente o "Meu Cachê" (soma dos valores nos shows em que está escalado).
  * Não visualiza o bloco de "Observações" do contratante.
  * Visualiza os membros da escala na página do show (somente nome e instrumento, sem valores nem controles).
  * Não visualiza a seção "Escala de Músicos" (cabeçalho, badge de confirmados e botão de adicionar).
  * **Não enxerga dados de outros tenants**: gigs, projetos, membros e lineups são todos filtrados por `tenantAdminId`. Se um viewer não está linkado a um admin (`invited_by IS NULL`), vê apenas listas vazias — nenhum dado de outros admins vaza.

---

## 4. Estrutura de Banco de Dados (PostgreSQL)
A fundação de dados do sistema (Supabase) está estruturada nas seguintes tabelas principais:

* **`go_profiles`**: Gerencia a autenticação e as roles (`admin` ou `viewer`). Inclui a coluna `invited_by` (FK para `go_profiles.id` de um admin) que linka cada viewer ao admin que o convidou — é a peça-chave do multi-tenant.
* **`go_projects`**: Os "produtos" da banda (ex: Baile, Casamento, Acústico), definindo cores para o calendário. Possui `admin_id` para isolamento por tenant.
* **`go_members`**: O banco de talentos/músicos da banda. Cruza com o e-mail do `go_profiles` para identificar quem está logado (dentro do tenant correto, via `admin_id`). Possui a coluna `calendar_token` para geração de links privados.
* **`go_gigs`**: A tabela central de eventos. Guarda Título, Horário (ISO UTC), Endereço, Valor Bruto, Observações, Custo de Som (`sound_cost`), Status do Som (`is_sound_paid`), e `reminder_minutes` (array de minutos para lembretes push). Inclui `admin_id` para isolamento por tenant.
* **`go_lineup`**: Tabela relacional de escala. Conecta um `member` a uma `gig`, definindo sua função (instrumento), valor do cachê (`fee_amount`) e status (`pago` / `pendente`).
* **`go_push_subscriptions`**: Armazena as assinaturas de dispositivos para o envio de notificações push.
* **`go_settings`**: Configurações globais da banda (Código de Convite e Token Global do iCal).
* **`go_reminders`**: Lembretes push agendados. Cada registro armazena `gig_id`, `remind_at` (data/hora do disparo) e `sent` (status de envio).

---

## 5. Funcionalidades Core (Regras de Negócio)

### 5.1. Gestão de Agenda e Escala
* **Criação de Gigs:** Admins definem data via componente de Calendário interativo e selecionam horários e local.
* **Escala de Músicos:** Admins selecionam membros do banco de talentos via busca com autocomplete (digite para filtrar, clique para selecionar). Membros não cadastrados podem ser adicionados como "avulsos" (apenas para aquela gig).
* **Auto-Escala do Admin:** Ao criar uma nova gig, o admin (se tiver registro de membro com o mesmo e-mail do login) já entra automaticamente na escala com cachê 0, editável.
* **Cópia Rápida de Logística:** Botão na Home que extrai Título, Data, Horário e Local para a área de transferência, omitindo as observações privadas.
* **Duplicação de Gigs:** Funcionalidade que permite clonar todos os dados de uma Gig existente (Logística, Custos de Som, Observações, etc.) para um novo evento, agilizando turnês e shows recorrentes.
* **Cancelamento com Notificação:** A exclusão de um show exige o preenchimento de um motivo obrigatório, que é disparado via Push Notification para toda a lineup escalada.
* **Cópia de E-mail para Gestão:** Na aba Perfil (Gestão de Banda), admins podem copiar o e-mail de novos músicos registrados para facilitar a atualização de seus dados no banco de talentos.
* **QuickAddGig Completo:** O modal de criação rápida agora inclui todos os campos: titulo, projeto, local, datas, valor bruto, equipamento de som (toggle + custo + responsavel), escala de musicos (seleção + cachê individual), repetição, observações e lembretes push.

### 5.1.1. Gestão de Membros (Equipe)
* **Cadastro:** Admins criam membros com nome, instrumento, WhatsApp (opcional) e e-mail (opcional). O e-mail vincula o membro ao login do app.
* **Edição:** Clique no card do membro para editar nome, instrumento, WhatsApp e e-mail.
* **Exclusão:** Botão de lixeira no card do membro (confirmação em dois cliques). Remove o membro do banco de talentos. Membros escalados em gigs anteriores permanecem no histórico da lineup.

### 5.1.2. Visão no Card da Agenda (Diferenciação por Role)
* **Admin:** Não exibe a badge "Não Escalado" no card. Se o admin não estiver na lineup, mostra "R$ 0,00" silenciosamente (admins são donos de todas as gigs, então "Não Escalado" não se aplica).
* **Viewer:** Exibe "Meu Cachê" ou "Não Escalado" normalmente.
* **Badge "Gig OK":** Movido para a linha financeira (ao lado do valor bruto), evitando o espaço apertado no topo do card.
* **Card "Shows Total" (header da Agenda):** Para **admin**, mostra o total de gigs do seu tenant. Para **viewer**, mostra apenas o total de gigs **passadas** em que ele **foi escalado** (lineup com `member_id === userMemberId` e `start_time < now`). Gigs canceladas ou em que ele não estava escalado não contam.

### 5.2. Motor Financeiro e Pendências
* **Cálculo de Lucro Líquido:** O sistema calcula em tempo real o lucro do evento: `Lucro = Cachê Bruto - Custo do Som - Soma(Cachês da Lineup)`.
* **Diferenciação de Visão:** 
  * **Home (Próximos):** Exibe o Lucro Estimado (o que a banda "ainda vai ganhar").
  * **Perfil (Dashboard):** Exibe o Lucro Realizado (só entra no gráfico o que já foi marcado como 'Pago').
* **"Seu Cachê" para Admin Escalado:** Na página de detalhes da gig, quando o admin está escalado (consta na lineup), o card de resumo financeiro exibe "Seu Cachê" com o valor do fee do admin em vez de "Lucro Líquido".
* **Motor de Pendências (Contas a Pagar):** 
  * O sistema varre eventos passados (`data < agora`).
  * Se houver músico pendente OU som não pago, o evento fica na seção amarela de **"Pendentes"** na Home.
  * Somente após o "check" financeiro total, o evento é arquivado visualmente (grayscale).

### 5.3. Sincronização de Calendário (iCal)
* **Geração Dinâmica:** Rotas API `/api/calendar/[token]` traduzem os dados para o padrão universal `.ics`.
* **Privacidade:** A exportação omite campos sensíveis como "Observações".
* **Assinatura Contínua:** Sincronização automática com Google Agenda, Apple Calendar e Outlook.
* **Adição por Gig:** Botão "Calendário" na página de detalhes do show e na Agenda permite baixar `.ics` individual ou abrir direto no Google Calendar.
* **Botão Full-Width na Gig:** Na página de detalhes da gig, há um botão grande "Adicionar ao Calendário" abaixo das informações do show, com dropdown para baixar `.ics` ou abrir no Google Calendar.
* **Ícone Destaque no Card:** No card compacto da agenda, o botão de calendário tem fundo indigo/azul com borda, destacando-se dos demais ícones.
* **Fuso Horário Google Calendar:** URL do Google Calendar inclui o parâmetro `ctz=America/Sao_Paulo` para garantir interpretação correta do fuso.
* **Tokens Automáticos:** Admins recebem `calendar_token` ao criar conta; músicos recebem ao serem cadastrados.

### 5.4. Notificações Push (Web Push)
* **Gatilho de Escala:** Quando o Admin salva a escala, o servidor dispara uma notificação via biblioteca `web-push` (VAPID) diretamente para o dispositivo cadastrado do músico. O texto da push inclui menção ao calendário: `"Você foi escalado para um novo show. Abra o app para ver os detalhes e adicionar ao seu calendário."`. O `url` da notificação aponta para `/gigs/[id]`, que já exibe o botão de calendário em destaque.
* **Gatilho de Cancelamento:** Ao cancelar um show com justificativa, todos os músicos impactados recebem o motivo em real-time.
* **Aviso de Novo Cadastro:** Admins são notificados sempre que um novo usuário entra na plataforma utilizando o código de convite da banda.
* **Ativar / Desativar:** Em `/profile`, o usuário pode tanto **ativar** quanto **desativar** as notificações. A desativação remove a subscription via `pushManager.unsubscribe()` no cliente e deleta o registro em `go_push_subscriptions` no servidor (`removePushSubscription` em `app/actions/push-actions.ts`).

### 5.5. Lembretes Push (Agendados)
* **Configuração na Criação:** Ao criar uma gig, o admin pode selecionar lembretes push com presets: 1 semana, 2 dias, 1 dia, 12 horas, 3 horas, 1 hora antes do evento.
* **Tabela `go_reminders`:** Armazena os lembretes com `gig_id`, `remind_at` e `sent`.
* **Endpoint Cron:** `/api/cron/check-reminders` processa lembretes pendentes e envia push para todos os músicos escalados naquela gig.
* **Segurança:** O endpoint requer header `Authorization: Bearer <CRON_SECRET>` para evitar acesso não autorizado.
* **Configuração Externa:** Use um serviço como [cron-job.org](https://cron-job.org) (gratuito) para chamar o endpoint a cada 5-15 minutos.

---

## 6. Diferenciais de Engenharia (Engenharia de Software)

### 6.1. Engine de Normalização de Fuso Horário (Smart Timezone)
O sistema resolve o conflito clássico de horários entre servidor e cliente:
* **Armazenamento:** Datas são salvas em ISO 8601 UTC.
* **Renderização:** O front-end normaliza a exibição forçando o fuso `America/Sao_Paulo`, garantindo que um administrador em viagem ou o servidor da Vercel em outra região vejam sempre o horário correto (ex: 19:30).

### 6.2. UX Adaptativa (Focus Mode)
Para otimizar o uso em celulares:
* **Hiding Navigation:** Ao abrir modais de alta interação (Cadastro de Gig), o sistema oculta a barra de menu inferior via CSS (`modal-open`). Isso expande a área útil e evita obstrução de botões críticos de salvamento.

### 6.3. Sistema de Tema (Dark / Light Mode)
O app possui alternância manual entre modo escuro e claro, com persistência via `localStorage`.

* **Componente `ThemeToggle`:** Botão fixo no canto superior direito de todas as páginas (`components/theme-toggle.tsx`). Exibe ícone de sol (☀️) no modo escuro e lua (🌙) no modo claro. Alterna a classe `.dark` no `<html>` e salva a preferência em `localStorage.theme`.
* **Script anti-flash:** Um `<script>` inline no `layout.tsx` lê `localStorage.theme` antes do React hidratar, adicionando ou removendo a classe `.dark` para evitar flash de tema errado.
* **CSS Override System (`globals.css`):** Em vez de usar o prefixo `dark:` do Tailwind em cada componente, o sistema aplica overrides globais via seletor `:root:not(.dark)`. Classes como `.bg-zinc-950`, `.bg-zinc-900`, `.bg-zinc-800`, `.text-zinc-50`, `.border-zinc-800`, `.hover\:bg-zinc-800`, etc. são redefinidas para suas equivalentes claras quando `.dark` não está presente. Isso permite que todo o app (incluindo componentes de terceiros como Sonner/Toast e Recharts) se adapte ao tema sem modificar cada componente individualmente.
* **Toaster Reactivo (`components/theme-toaster.tsx`):** Wrapper do Sonner que observa mudanças na classe `.dark` via `MutationObserver` e ajusta as cores do toast (`background`, `border`, `color`) em tempo real.

### 6.3. Segurança Nativa (RLS)
* **Row Level Security:** Camada de segurança ativa no PostgreSQL (Supabase). Se um usuário `viewer` tentar burlar o front-end e acessar a API diretamente para ver o cachê bruto de um show, o banco de dados bloqueia o retorno das colunas proibidas com base no ID do usuário autenticado.

### 6.4. Isolamento de Dados por Admin (admin_id)
* **Conceito:** As tabelas `go_gigs`, `go_members` e `go_projects` possuem a coluna `admin_id` (FK para `go_profiles.id`). Todo INSERT carimba o UUID do admin logado.
* **Filtro obrigatório:** SELECTs de admin são SEMPRE filtrados por `.eq('admin_id', userId)`. Viewers continuam vendo dados via `go_lineup`.
* **Server Actions:** Todas as actions de criação, atualização e exclusão verificam `admin_id` para garantir ownership.
* **Fluxo "Criar Minha Banda":** Novo admin se cadastra e já ganha um perfil com `role='admin'` em `go_profiles`, entrando em ambiente isolado.

### 6.5. Multi-Tenant Seam (`tenantAdminId`)

Toda página que lê dados do banco segue o mesmo contrato:

```ts
const { role, memberId: userMemberId, userId, invitedBy } = await getUserInfo();
const tenantAdminId = role === 'admin' ? userId : invitedBy;

// Toda query subsequente filtra por tenantAdminId:
gigsQuery     = gigsQuery.eq('admin_id', tenantAdminId);
projectsQuery = projectsQuery.eq('admin_id', tenantAdminId);
membersQuery  = membersQuery.eq('admin_id', tenantAdminId);
```

**Regras de borda:**
* Se `tenantAdminId === null` (viewer sem `invited_by`), todas as listas retornam vazio. Isso impede vazamento de dados de outros admins.
* O `go_lineup` (que não tem `admin_id` próprio) é buscado apenas para os `gig_id` já filtrados do tenant: `supabase.from('go_lineup').select('*').in('gig_id', tenantGigIds)`. Assim, viewers só veem lineups de gigs do **seu** admin.
* Em `app/gigs/[id]/page.tsx`, o viewer precisa passar **duas** checagens antes de ver os detalhes:
  1. `gigData.admin_id === tenantAdminId` (pertence ao seu admin)
  2. O viewer está escalado no lineup daquele gig
  Falha em qualquer → "Acesso Negado".

**Resolução do `go_members.id` para o viewer** (`lib/auth.ts:getUserInfo`):
1. Carrega o profile do viewer (incluindo `invited_by`).
2. Determina `targetAdminId`:
   - Admin: `targetAdminId = user.id` (o próprio).
   - Viewer: `targetAdminId = invited_by` (o admin que o convidou).
3. Resolve o `member_id` buscando em `go_members` por `(email, admin_id)`.

Sem o passo 2, o `memberId` do viewer seria `null` e ele não veria nenhum show — bug crítico que existia antes do fix.

---

## 7. Fluxos de Operação (Manuais)

* **Adição de Novo Músico:** Admin cadastra o músico com e-mail real -> Músico cria conta -> O sistema vincula automaticamente (`signup()` grava `go_profiles.invited_by = admin_id`, e `getUserInfo()` resolve o `go_members.id` correspondente via `(email, admin_id)`).
* **Pagamento de Som:** Realizado no modal da Gig ou na página de detalhes, impactando diretamente o cálculo de pendências e lucro realizado.
* **Configuração de Lembretes:** Ao criar uma gig, selecione os lembretes desejados. Configure um cron externo (ex: cron-job.org) para chamar `/api/cron/check-reminders` a cada 5-15 minutos com o header `Authorization: Bearer <CRON_SECRET>`.
* **Trocar de banda (viewer):** Em `/profile`, o viewer pode informar um novo código de convite (`updateInvitedBy` em `app/profile/actions.ts`). Isso regrava `invited_by` no `go_profiles` e a próxima requisição passa a ver os dados do novo admin.
* **Admin descobre seus convidados:** A página `/profile` lista todos os `go_profiles` com `invited_by = userId`, mostrando os usuários que se cadastraram via código de convite.

---

## 8. Variáveis de Ambiente

| Variável | Descrição |
|----------|-----------|
| `NEXT_PUBLIC_SUPABASE_URL` | URL do projeto Supabase |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Chave anônima do Supabase |
| `SUPABASE_SERVICE_ROLE_KEY` | Chave de serviço (admin) do Supabase |
| `NEXT_PUBLIC_SITE_URL` | URL base do app (localhost ou Vercel) |
| `NEXT_PUBLIC_VAPID_PUBLIC_KEY` | Chave pública VAPID (Web Push) |
| `VAPID_PRIVATE_KEY` | Chave privada VAPID (Web Push) |
| `VAPID_ADMIN_EMAIL` | E-mail do admin VAPID |
| `CRON_SECRET` | Secret para autenticar o endpoint de lembretes |

---

## 9. Componentes de Calendário

| Componente | Arquivo | Uso |
|------------|---------|-----|
| `AddToCalendarButton` | `components/add-to-calendar-button.tsx` | Dropdown com "Baixar .ics" e "Abrir no Google Calendar". Usado na página do gig (ícone) e na agenda (compacto). |

---

## 10. Configuração do Supabase Auth

* **Site URL:** `https://minhabanda.vercel.app/`
* **URI Allow List:** `http://localhost:3000/*`, `https://minhabanda.vercel.app/*`
* **Email autoconfirm:** Ativado (não precisa confirmar email)
* **Senha:** Mínimo 8 caracteres, maiúscula + minúscula + número + especial

---

## 11. Migrações do Banco

As migrations ficam versionadas em `supabase/migrations/` e são aplicadas via Supabase Management API. Mantenha-as em ordem cronológica.

### 11.1. `20250101000000_create_reminders.sql` — Lembretes Push

```sql
-- Table: go_reminders
CREATE TABLE IF NOT EXISTS go_reminders (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  gig_id UUID NOT NULL REFERENCES go_gigs(id) ON DELETE CASCADE,
  remind_at TIMESTAMPTZ NOT NULL,
  sent BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_go_reminders_due
  ON go_reminders(remind_at)
  WHERE sent = FALSE;

CREATE INDEX IF NOT EXISTS idx_go_reminders_gig
  ON go_reminders(gig_id);

ALTER TABLE go_reminders ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins manage their reminders" ON go_reminders
  FOR ALL
  USING (
    gig_id IN (
      SELECT id FROM go_gigs WHERE admin_id = auth.uid()
    )
  );

-- Add reminder_minutes column to go_gigs
ALTER TABLE go_gigs ADD COLUMN IF NOT EXISTS reminder_minutes INTEGER[] DEFAULT '{}';
```

### 11.2. `20250115000000_add_invited_by.sql` — Multi-tenant viewer link

```sql
ALTER TABLE go_profiles
  ADD COLUMN IF NOT EXISTS invited_by UUID REFERENCES go_profiles(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_go_profiles_invited_by
  ON go_profiles(invited_by);
```

**Por que existe:** antes desta migration, o signup tentava gravar `invited_by` mas a coluna não existia — toda a lógica de viewer (filtros de agenda, dashboard, gigs por tenant) estava silenciosamente quebrada. Esta migration restaura a peça-chave do multi-tenant e habilita a página `/profile` do admin listar os usuários convidados.

**Backfill de usuários existentes:**

```sql
UPDATE go_profiles p
SET invited_by = m.admin_id
FROM go_members m
WHERE p.role = 'viewer'
  AND p.email = m.email
  AND p.invited_by IS NULL;
```

Viewers sem `go_members` correspondente (ex: admin não os cadastrou como músicos com o mesmo email) precisarão re-linkar via `/profile` → "Trocar de banda", informando o código de convite.

