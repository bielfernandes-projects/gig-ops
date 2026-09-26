# Documentação Oficial: Gigueiros (GigOps)

## 1. Visão Geral do Produto
O **Gigueiros** é um SaaS (Software as a Service) Mobile-First construído em formato PWA (Progressive Web App). Seu objetivo é centralizar a logística, a agenda e a gestão financeira de bandas e projetos musicais, eliminando a dependência de grupos de WhatsApp e planilhas de Excel.

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
* **Auto-Escala de Sócios e Fixos:** Ao criar uma nova gig, os sócios (donos com registro de músico vinculado) e os músicos marcados como "Fixo" já entram automaticamente na escala com cachê 0, editável (ver seção 21).
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
* **iOS / Safari:** O iOS só suporta Web Push em PWA standalone (adicionado à Tela de Início). O `start_url` do manifesto é `/dashboard` (evita redirect `'/' → '/dashboard'` que quebra escopo do service worker no iOS). `app/manifest.ts` e `profile-client.tsx` incluem detecção de iOS + modo standalone — se o usuário estiver no Safari (não-PWA), o toast orienta a adicionar à Tela de Início.
* **Middleware:** O matcher em `proxy.ts` exclui `sw.js` e `manifest` para evitar que o auth middleware (que redireciona não-autenticados) bloqueie a requisição do service worker ou do manifesto.

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
* **Fluxo "Criar minha banda":** Novo admin se cadastra e já ganha um perfil com `role='admin'` em `go_profiles`, entrando em ambiente isolado.

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
| `STRIPE_SECRET_KEY` | Chave secreta do Stripe (`sk_live_…`), só no servidor |
| `STRIPE_WEBHOOK_SECRET` | Segredo de assinatura do webhook (`whsec_…`) |
| `STRIPE_PRICE_MONTHLY` / `STRIPE_PRICE_FOUNDER` / `STRIPE_PRICE_ANNUAL` | IDs dos preços do Stripe: R$ 49,90/mês, R$ 24,90/mês (Fundador) e R$ 499,00/ano |

---

## 9. Componentes de Calendário

| Componente | Arquivo | Uso |
|------------|---------|-----|
| `AddToCalendarButton` | `components/add-to-calendar-button.tsx` | Dropdown com "Baixar .ics" e "Abrir no Google Calendar". Usado na página do gig (ícone) e na agenda (compacto). |

---

## 10. Configuração do Supabase Auth

* **Domínio de produção:** `https://www.gigueiros.com.br` (o apex `gigueiros.com.br` redireciona 308 para o `www`; ambos ligados ao projeto `gig-ops` na Vercel). `minhabanda.bf.dev.br` continua ativo como alias antigo.
* **Site URL:** `https://www.gigueiros.com.br`
* **URI Allow List (Redirect URLs):** `http://localhost:3000/**`, `https://minhabanda.bf.dev.br/**`, `https://www.gigueiros.com.br/**`, `https://gigueiros.com.br/**` — tem que ser `/**` (globstar), não `/*`: no matcher do Supabase o `*` não atravessa `/`, então `/*` não casa com `/auth/callback` (ver §38).
* **Google OAuth (cliente "Gigueiros Web"):** origens JavaScript `minhabanda.bf.dev.br`, `www.gigueiros.com.br`, `gigueiros.com.br`; redirect URI é o callback do Supabase.
* **Vercel:** `NEXT_PUBLIC_SITE_URL=https://www.gigueiros.com.br` (production e preview).
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


---

## 12. Segurança e go-live (set/2026)

* **Escritas com sessão:** server actions usam `requireAdmin()` (`lib/auth.ts`), que devolve o cliente da sessão e exige `role = 'admin'`. Páginas leem com `createClient()` (sessão); não existe mais cliente anônimo global.
* **Service role (`lib/supabase/admin.ts`):** só no servidor, sem fallback para a anon key. Usado em cadastro/convite, push, iCal e cron.
* **Push (`lib/push.ts`):** funções de envio internas (fora de `'use server'`). `savePushSubscription`/`removePushSubscription` exigem `userId` igual ao da sessão. Aviso de novo cadastro vai só ao admin dono do código.
* **Rotas públicas (proxy):** `/`, `/termos`, `/privacidade`, `/api/calendar/*` (token) e `/api/cron/*` (`CRON_SECRET`). O feed iCal filtra por `admin_id`.
* **Performance:** `proxy.ts` usa `getClaims()` (validação local do JWT) e `getUserInfo` é memoizado por requisição.
* **RLS:** migration `20260921000001_enable_rls.sql` (helpers em schema `private`). Admin vê o tenant; músico vê só os shows em que está escalado. `go_profiles`, `go_settings` e `go_push_subscriptions` só são escritos pelo servidor.
* **Assinatura (ativação manual até a cobrança por cartão existir):** `go_settings.subscription_status` (`trial`/`active`/`expired`), `trial_ends_at`, `paid_until`. Ativar: `UPDATE go_settings SET subscription_status='active', paid_until=now()+interval '30 days' WHERE admin_id='<uuid>';`.
* **Landing:** `/` pública com preço e CTA; `/termos` e `/privacidade`.

## 13. Backlog pós-go-live

* **Domínio:** `gigueiros.com.br` (apex) é o domínio principal; `www.gigueiros.com.br` redireciona pra ele (308). O alias antigo `minhabanda.bf.dev.br` foi removido do projeto.
* **Banco:** hospedado em São Paulo (`ggjfhipruemkxavhwglm`), função Vercel em `gru1`. O projeto antigo (Oregon) fica como backup até ser desativado.
* **Auth:** "leaked password protection" (Authentication → Providers → Email → "Prevent use of leaked passwords") ainda não ativado — o toggle liga na tela, mas o Supabase bloqueia ao salvar porque é recurso exclusivo do plano Pro. Requer upgrade do projeto pra ativar.

---

## 14. Bandas, papéis e assinatura (Fase 0 do plano unificado)

Ver `docs/PLANO-UNIFICADO.md`. Estado após a Fase 0:

* **Modelo:** `bands` (nome, `invite_code`, `calendar_token`), `band_members` (`owner` | `member`) e `subscriptions` (por banda: trial de 7 dias, `active`, `expired`, plano). Uma pessoa pode estar em várias bandas com papéis diferentes; os donos têm direitos iguais.
* **Compatibilidade:** as bandas existentes usam o mesmo id do antigo admin. `admin_id` continua nas tabelas, mantido igual a `band_id` por trigger, e as políticas antigas seguem valendo até a migration de limpeza (drop de `admin_id`, `go_settings` e políticas antigas).
* **Código:** `lib/auth.ts` (`getUserInfo` devolve `bandId`, `memberships`, `subscription`; `requireOwner()` valida dono e assinatura), `lib/bands.ts` (criar banda, entrar por código), `lib/subscription.ts`. A banda ativa fica no cookie `gg_band`, validado contra as participações reais.
* **Assinatura:** `expired` (teste vencido ou pagamento vencido) bloqueia toda escrita nas ações do dono (`requireOwner`); os dados ficam intactos. Ativação manual: `UPDATE subscriptions SET status='active', paid_until=... WHERE band_id='<uuid>'`.
* **Segurança:** `calendar_token` da banda não é legível pelo cliente (privilégio por coluna). Membros e assinaturas só são escritos pelo servidor (service role).
* **Perfil:** trocar de banda, entrar em outra banda por código, criar nova banda, renomear, código de convite, promover ou rebaixar donos e remover músicos.
* **Backup da migração:** schema `backup_fase0` no próprio banco.

---

## 15. Gestão melhorada (Fase 1 do plano unificado)

* **Tipo de evento** (`go_gigs.event_type`, texto livre com sugestões em `lib/finance.ts`): escolhido ao criar e editar o show, usado no relatório.
* **Despesas do show** (`gig_expenses`): categoria, descrição e valor, visíveis só aos donos. O lucro do show passa a descontar músicos, som **e** despesas.
* **Recebimento do contratante** (`gig_payments`, `go_gigs.track_receipts`): opcional por show. Sem o controle, o cachê bruto conta como recebido por inteiro (comportamento anterior). Com o controle, registra sinal e restante e calcula o pendente. Regra em `gigFinance()` (`lib/finance.ts`).
* **Relatório** (`/relatorio`): para donos, faturamento, recebido, pendente, custos e lucro por mês, gráfico dos últimos 6 meses, faturamento por tipo de evento, custos por categoria e shows com recebimento pendente. Para músicos, "Meus cachês" somando o que têm a receber em todas as bandas (donos alternam entre as duas visões).
* **Confirmação de presença** (`go_lineup.confirmation`): o músico confirma ou recusa na página do show; o dono vê o status na escala e recebe push quando alguém recusa. Só a ação do servidor altera o campo.
* **Conflito de agenda** (`lib/conflicts.ts`): ao escalar, avisa quando o músico já tem outro show no mesmo horário. Na mesma banda mostra o título; em outra banda só informa que há compromisso, para uma banda nunca ver os detalhes da outra.

---

## 16. Módulo Repertório (Fase 2 do plano unificado)

* **Sem raspagem.** O app não busca cifra em site nenhum. O músico cola o texto da cifra ou da letra (campo `songs.chart_text`, visível só à banda) e pode guardar o link da fonte; o formulário oferece um atalho "Procurar no Cifra Club" que apenas abre a busca do site.
* **Catálogo da banda** (`songs`, página `/repertorio`): qualquer membro adiciona; edita e apaga quem criou ou um dono. Tom original, "Tom que começa" (acorde/tom pedido à harmonia para iniciar, ex: música em C que começa em Am), observações da música (início da letra, solo etc.), BPM, link da cifra, link da letra (busca no Letras.mus.br, coluna `lyrics_url`) e PDF. O campo de texto colado da cifra saiu do formulário (músicas antigas mantêm o texto já salvo). O "Tom que começa" acompanha a transposição (música subiu 1 tom, o "tom que começa" também). Aparecem no visualizador, na lista do show e no modo palco.
* **Repertório do show** (`setlists`, `blocks`, `block_songs`): montado só por donos na página do show ou em `/repertorio` (desde o §35 não é mais um por show: vários shows podem usar o mesmo repertório) (blocos, ordem, tom da música neste repertório (o lápis muda esse tom e o "tom que começa" acompanha), observação e nota de passagem). Desde o §35, qualquer membro da banda lê os repertórios da banda; só donos editam.
* **Abrir repertório no show**: na página do show (`/gigs/[id]`) há só um seletor compacto do repertório usado (`components/gig-setlist-picker.tsx`; donos escolhem, ao selecionar já salva; os demais só leem) e o botão "Abrir repertório", habilitado quando há repertório, que leva a `/repertorio/lista/[id]` (blocos, tons, "tom que começa" em amarelo, tons pedidos e observações). O antigo modo palco (`/palco/[id]`) foi removido por enquanto (recuperável pelo histórico do git).
* **Link público** (`/s/[token]`, `setlist_share_links`): somente leitura, sem login (desde o §35 mostra o repertório completo, com cifra e PDF). O token (64 caracteres) só é lido pelo servidor e o dono pode revogar.
* **Módulo por plano:** as ações exigem `subscriptions.module_repertorio` (`requireBand('repertorio')` / `requireOwner('repertorio')`).
* **Transposição** (`lib/transpose.ts`, teste em `npm run check:transpose`): o texto colado é transposto do tom original para o tom da música no repertório no repertório (linhas de acordes e acordes entre colchetes), mantendo o alinhamento; escolhe bemóis ou sustenidos conforme o tom de destino. O visualizador oferece "Ver no tom original".
* **Repertórios pessoais** (`setlists.scope = 'personal'`, `songs.scope = 'personal'`): qualquer membro cria os seus em `/repertorio`; só quem criou vê e edita (nem os donos da banda). Repertórios pessoais podem usar músicas da banda e as próprias; repertórios oficiais de show só usam músicas da banda.
* **Leitura offline dos próximos shows** (`app/api/offline-prefetch/route.ts`, `components/offline-setup.tsx`, `public/sw.js`): ao carregar o app, o cliente busca as próximas gigs do usuário (e as respectivas páginas de palco, encontradas por `go_gigs.setlist_id`) e manda o service worker cachear essas páginas via `postMessage({ type: 'PREFETCH', urls })` — assim elas ficam legíveis offline mesmo sem terem sido abertas antes (ex: show sem sinal).

## 17. Rateio entre sócios, contratante e recibo (Fase 3)

- `band_members.profit_share` (0–100, nulo = divisão igual): definido pelos donos no Perfil (`setProfitShare`). O `/relatorio` mostra "Divisão do lucro entre os donos" quando há mais de um dono (`splitProfit` em `lib/finance.ts`; o último dono absorve o arredondamento).
- `go_gigs.client_name`: campo "Contratante" no cadastro/edição do show; aparece no recibo.
- Recibo: `/gigs/[id]/recibo` (só donos), valor por extenso (`lib/extenso.ts`), `?p=<id do pagamento>` emite recibo de uma parcela. Imprime/salva em PDF via `window.print()`; menu lateral e navegação móvel têm `print:hidden`.
- Verificações: `npm run check:finance`, `check:extenso`, `check:transpose`.

## 18. Indicação por crédito
- `bands.referred_by`: ao criar banda (onboarding), o campo opcional "Código de indicação" aceita o código de convite de outra banda. Se válido, a banda indicadora ganha +30 dias (trial ou período pago) via `grantReferralCredit` em `lib/bands.ts` (service role, best effort). Código inválido bloqueia a criação com mensagem.

## 19. Leitura offline
`public/sw.js` guarda a última cópia (network-first) de `/dashboard`, `/agenda`, `/gigs/[id]`, `/repertorio/*` e a serve sem sinal. `components/offline-setup.tsx` registra o SW e limpa o cache ao abrir `/login` (logout/aparelho compartilhado). Só páginas já visitadas funcionam offline; escrita exige conexão.

## 20. Nome de visualização
`go_profiles.display_name` (até 40 caracteres, opcional), editado no Perfil pelo lápis ao lado de "Nome" (`setDisplayName`, service role); o Perfil também mostra o e-mail (só leitura) e a banda selecionada (lápis para donos, `renameBand`). A notificação "entrou na banda" usa o nome (`nameOf`). Aparece no cabeçalho do Perfil (e-mail em menor), na lista de membros e na divisão de lucro do relatório; sem nome, cai para o e-mail.
- Relatório da banda: o card "A receber de shows já realizados" soma, em qualquer mês, o que falta receber dos shows passados com acompanhamento de recebimento (`track_receipts`); lista cada show com o valor devido.
- Agenda: cards "Próximos cachês" (meu cachê nos shows futuros), "A receber" (meu cachê não pago em shows já realizados), "A pagar à equipe" (dono: músicos e som não pagos de shows passados), "Shows no total" e "Na seleção". `go_gigs.track_receipts` agora é ligado por padrão em shows novos.
- Agenda abre em modo Calendário (grade mensal, cada show é uma linha no dia, links `?mes=AAAA-MM`); o botão Detalhado (`?view=detalhado`) mostra a lista de antes. No calendário só o filtro de projeto é exibido.

## 21. Músicos fixos na escalação
- `go_members.is_fixed` (padrão `false`): marcado pelo dono no botão "Fixo" de cada card em `/members` (`toggleMemberFixed`).
- Sócios (músico cujo `user_id` é dono em `band_members`) aparecem com o selo "Sócio" e entram sempre, sem flag.
- Ao abrir "Novo Show" (`QuickAddGig`), a escala já vem com sócios + fixos e cachê R$ 0; basta preencher os valores ou remover quem não vai. Duplicar gig mantém o comportamento de antes (sem pré-seleção). A lista `defaultMemberIds` é calculada em `/agenda` no mesmo `Promise.all` das outras consultas.

## 22. PDF por música no repertório
- Bucket privado `song-pdfs` no Supabase Storage (10MB, só `application/pdf`), arquivo salvo como `{song_id}.pdf`.
- Permissão do arquivo espelha a permissão de editar a música (`songs_update`/`songs_delete`): dono da banda ou quem criou a música, ou dono no caso de música pessoal — reaproveita `private.is_band_member`/`is_band_owner`.
- `songs.pdf_path` guarda o path do arquivo. Upload/remoção pelo formulário de música em `/repertorio` (`catalog-client.tsx`); a mesma música pode ter cifra colada, link e PDF ao mesmo tempo.
- Visualização via `getSongPdfUrl` (`app/actions/song-actions.ts`): gera signed URL sob demanda (5 min) e abre em nova aba. Botão "Abrir PDF" aparece no catálogo, no `SongViewer` (repertório de show e catálogo) e no modo palco.
- Ao apagar uma música, o PDF é removido do storage antes da linha ser apagada (a policy de Storage depende da música ainda existir).
- O link público de repertório (`/s/[token]`) não expunha PDF nem cifra na época; hoje expõe (ver §35).

## 23. Grupo do WhatsApp dos Fundadores
- `FOUNDER_WHATSAPP_URL` (env var, vazia por padrão): link de convite do grupo exclusivo.
- Quando a banda tem `subscriptions.price_plan = 'founder'` e a env var está preenchida, o Perfil (seção "Gestão da banda") mostra um card com o link. Sem env var configurada, nada aparece — sem depender de e-mail (Resend ainda não existe).

## 24. Prints reais, lightbox e carrossel na Landing Page
- Seção "O app de verdade, sem enrolação": Dashboard em destaque com moldura de dispositivo (notebook maior, tablet e celular ao lado), mostrando responsividade e o esquema de PWA. Componente `DeviceChrome` em `components/screenshot-lightbox.tsx` desenha as molduras com CSS puro (sem imagens de bezel).
- Qualquer print é clicável e abre em tamanho grande num lightbox (`ClickableShot`, com Esc/clique fora pra fechar).
- Abaixo, `FeatureCarousel` (mesmo arquivo) alterna automaticamente entre Agenda, Financeiro, Repertório, Relatório e Músicos a cada 4s, com transição de slide; para no hover e para permanentemente após qualquer clique (inclusive nos indicadores), continuando clicável pro lightbox.
- Os prints ficam em `public/screenshots/` (dashboard-desktop/tablet/mobile, agenda, repertorio, financeiro, relatorio, musicos) — capturados com dados fictícios numa banda de teste renomeada, para não expor identidade da conta nem dados reais.

## 25. Resend para e-mails transacionais (Auth)
- Domínio `gigueiros.com.br` verificado no Resend. SMTP customizado configurado no Supabase (Authentication → Emails → SMTP Settings): host `smtp.resend.com`, porta 465, usuário `resend`, senha = API key do Resend, remetente `naoresponda@gigueiros.com.br`.
- Templates de e-mail (Confirm signup, Reset Password) personalizados em HTML, versionados em `supabase/email-templates/` — colados manualmente no painel do Supabase (Authentication → Emails → Templates), pois a configuração de Auth não é exposta pela API/MCP disponível, só pelo dashboard.
- Fora do escopo por enquanto: convite (Invite) e magic link, que o app não usa hoje (login é por senha ou Google OAuth).

## 26. SEO e Analytics
- `app/robots.ts` e `app/sitemap.ts`: geram `/robots.txt` e `/sitemap.xml`. Rotas internas do app (dashboard, agenda, etc.) ficam bloqueadas pro crawler — não têm valor de indexação e a maioria já exige login.
- `app/opengraph-image.tsx`: imagem de Open Graph gerada dinamicamente (sem arquivo estático), no visual da LP, usada em compartilhamentos (WhatsApp, LinkedIn, etc.) para todas as páginas.
- Metadados: `metadataBase`, Open Graph e Twitter Card configurados em `app/layout.tsx` (padrão) e sobrescritos na LP (`app/page.tsx`) com título/descrição específicos e `alternates.canonical`.
- Dados estruturados: JSON-LD `SoftwareApplication` na LP (nome, descrição, preço).
- `@vercel/analytics` e `@vercel/speed-insights` instalados e adicionados ao layout raiz. **Pendente**: habilitar as abas "Analytics" e "Speed Insights" no dashboard da Vercel (Project → Analytics / Speed Insights → Enable) — não é exposto pela API do projeto, só pelo dashboard.

## 27. Acesso grátis pra amigos/testers
- `supabase/scripts/grant-free-access.ts` (`npm run grant-free -- email1@x.com email2@y.com`): dado o e-mail de quem já criou conta e uma banda, acha o usuário (Auth Admin API, já que `auth.users` não é filtrável por e-mail direto), localiza a(s) banda(s) das quais é dono (`band_members.role = 'owner'`) e atualiza `subscriptions` pra `status = 'active'`, `paid_until = null` — acesso completo (Gestão + Repertório) sem cobrança e sem data de expiração.
- Não mexe em `price_plan`: fica `standard` (padrão), de propósito, pra não contar como vaga real no contador de "Fundadores" da landing page.
- Pré-requisito: a pessoa precisa ter feito login e criado a banda no onboarding antes de rodar o script (precisa existir a linha em `band_members`/`subscriptions`).
- Reverter depois: `update subscriptions set status = 'expired' where band_id = '<uuid>';`.

## 28. Conflito de e-mail no login com Google
- Quando alguém tenta "Continuar com Google" usando um e-mail que já tem conta por senha (e o linking automático está desligado no Supabase, o padrão), o GoTrue recusa a troca do `code` por sessão com um código de erro (`email_exists`, `user_already_exists`, `identity_already_exists`, `manual_linking_disabled` ou `email_conflict_identity_not_deletable`, dependendo da versão).
- `app/auth/callback/route.ts` agora repassa esse código pra `/login?erro=google&motivo=<code>` (antes só mandava pra `/login?erro=google` e a página nunca lia esse parâmetro — a pessoa só via o formulário de login vazio de novo, sem nenhum aviso).
- `app/login/page.tsx` lê `erro`/`motivo` da URL (via `useSearchParams`, por isso a página virou um `Suspense` por fora) e mostra uma mensagem específica pra conflito de e-mail ("Esse e-mail já tem uma conta... entre com e-mail e senha") ou uma genérica pros demais casos; a URL é limpa (`history.replaceState`) depois de ler.

## 29. Gestão da assinatura no Perfil
- Card "Gestão da banda" no Perfil (dono) agora mostra: nome do plano (`price_plan`: Banda / Banda (Fundador) / Solo), status (teste grátis com dias restantes, ativa ou expirada) e a data relevante — fim do teste (`trial_ends_at`) ou renovação (`paid_until`; sem data quando o acesso foi liberado manualmente via `grant-free-access.ts`, seção 27).
- Botão "Cancelar assinatura" (só aparece em trial/ativa): `cancelSubscription()` em `app/profile/actions.ts` marca `status = 'expired'` na hora — não existe cobrança recorrente automática pra "desligar" (hoje é tudo manual/Pix), então cancelar significa abrir mão do acesso de escrita imediatamente; os dados continuam salvos, e reativar depois é manual (SQL ou `grant-free-access.ts`) ou pagando pelo Stripe (§37). Quando a banda já tem assinatura no Stripe, esse botão some: cancelar passa a ser pelo portal do cliente (§37). Escreve via `createAdminClient()` porque `subscriptions` não aceita update do cliente de sessão (revogado em `supabase/migrations/20260922000000_fase0_bands.sql`).
- `lib/subscription.ts` (`SubscriptionState`) e `lib/auth.ts` (`UserInfo.pricePlan`) passaram a expor as datas cruas e o plano, além do estado computado, pra alimentar esse card.

## 30. Tour guiado de primeiro uso
- `components/app-tour.tsx` (react-joyride v3, montado no Dashboard via `next/dynamic` com `ssr: false`): abre sozinho no primeiro acesso ao Dashboard, com roteiro diferente pra dono (equipe → shows → repertório → relatório → perfil/convite) e pra músico (seus shows → repertório → seus cachês → notificações). Curto e pulável a qualquer momento, seguindo o princípio de mostrar o que fazer primeiro, não tudo que existe.
- Os passos apontam pros itens da navegação (`data-tour-nav` em `components/navigation.tsx`); como a barra lateral (desktop) e a inferior (mobile) ficam as duas no DOM, o alvo é a que estiver visível.
- "Já visto" fica no `localStorage` (`gg-tour-v1:<admin|viewer>`), por aparelho. O Perfil tem "Ver tour", que abre `/dashboard?tour=1` e força o replay.

## 31. Filtro "Todas as bandas" (visão consolidada)
- O filtro de banda (`components/band-switcher.tsx`, no cabeçalho de Dashboard, Agenda, Repertório, Relatório, Músicos e Projetos) ganhou **"Todas as bandas"**, que é o padrão pra quem está em 2+ bandas. O cookie `gg_band` guarda `all` (`ALL_BANDS` em `lib/band-view.ts`) ou o id de uma banda; cookie ausente ou inválido = "Todas".
- `getUserInfo()` (`lib/auth.ts`) agora expõe `allBands`, `bandIds` (bandas no escopo da tela) e `bands` (papel, `memberId`, assinatura e módulos **por banda**, pra todas as bandas da pessoa). Em "Todas", `bandId` é `null` e `role` é `admin` se a pessoa é dona de alguma banda — **decisões por registro usam `bands[registro.band_id]`**, porque a pessoa pode ser dona de uma banda e músico de outra.
- Leitura: as páginas usam `.in('band_id', info.bandIds)` e decidem por item (dono vê tudo da banda e o financeiro; músico vê só shows em que está escalado e o próprio cachê). Itens ganham uma etiqueta com o nome da banda (`components/band-tag.tsx`). Músicos, Projetos e catálogos do Repertório são agrupados por banda. O Relatório "Banda" soma só as bandas que a pessoa é dona (a divisão de lucro entre sócios só aparece com uma banda selecionada); "Meus cachês" respeita o filtro.
- Escrita: ações sobre registros existentes resolvem a banda pelo próprio registro (`requireOwnerFor` / `requireBandFor` / `bandOf` / `bandOfLineup` em `lib/auth.ts`), então funcionam em qualquer visão. Criações recebem `band_id` do formulário: `components/band-select-field.tsx` (campo "Banda", escondido quando só há uma opção) em músico e projeto; "Novo Show" tem o seletor e troca projetos/equipe conforme a banda; música nova vai pro catálogo em que foi criada; repertório pessoal tem seletor de banda.
- Páginas de detalhe (show, recibo, repertório pessoal) seguem a banda do próprio registro, independente do filtro.
- "Gestão da banda" no Perfil (nome, convite, sócios, assinatura) continua exigindo uma banda selecionada; em "Todas" o Perfil orienta a tocar em "Usar", e há um botão "Ver todas" pra voltar à visão consolidada.

## 32. Sair pela navegação
- Botão "Sair" no rodapé da barra lateral (desktop) e como último item da barra inferior (mobile), em `components/navigation.tsx`, usando a mesma ação `signout` do Perfil.

## 33. Menu do celular e fluxo pós-login
- Celular: sem barra inferior; `components/mobile-nav.tsx` tem barra superior fixa (hambúrguer à esquerda, logo, "Sair" à direita) e um menu lateral com as páginas e, no rodapé, "Sair" e tema (só ícones). Desktop segue com a barra lateral. A classe `has-mobile-nav` (em `<html>`) dá o espaço do topo ao `main`.
- Tour no celular: os passos abrem/fecham o menu por evento (`NAV_EVENT`) antes de apontar pros itens.
- Login redireciona direto pra `/dashboard` (antes ia pra `/`, que o proxy redirecionava; em produção o `usePathname` do layout ficava em `/` e o menu só aparecia após atualizar, o que também fazia o tour perder os alvos e sumir).

## 34. Filtro de banda global e cabeçalho padrão
- O filtro de banda saiu das páginas: agora é global (`BandFilter` em `components/band-switcher.tsx`), acima de "Dashboard" na barra lateral (desktop) e na barra superior do celular, à esquerda do "Sair" (a logo do topo saiu; ela fica só dentro do menu hambúrguer). Como vive no layout raiz, carrega as bandas por `GET /api/bands`; recarrega ao trocar de página e no evento `gg:bands-changed` (disparado pelo Perfil ao entrar/criar/sair de banda). Só aparece com 2+ bandas.
- Todas as páginas usam `components/page-header.tsx`: título + descrição curta, largura total, conteúdo logo abaixo (sem o nome da banda no subtítulo). No Relatório, o seletor Banda/Meus cachês e a navegação por mês ficam numa linha abaixo do cabeçalho.
- Botão de tema: no Dashboard aparece só no desktop (canto superior direito); no celular fica no rodapé do menu; e sempre em Perfil > Aparência.

## 35. Repertórios reutilizáveis e repertório principal (Fase 4 do plano unificado)

* **Repertório deixa de ser 1-para-1 com o show**: `go_gigs.setlist_id` aponta pro repertório usado (vários shows podem apontar pro mesmo). `setlists` não tem mais `gig_id`. No show, o dono pode anexar (`attachSetlistToGig`), trocar ou desanexar um repertório.
* **Repertório principal** (`setlists.is_default`, um por banda entre os de escopo `band`): todo show novo nasce com o repertório principal da banda já anexado (`addQuickGig` em `app/actions/gig-actions.ts`). Marcar/trocar o principal é feito em `/repertorio` (`setDefaultSetlist`, RPC `set_default_setlist` — troca atômica). A função vive no schema `public` (`security definer`, `execute` só para `authenticated`) para o PostgREST conseguir chamá-la; a checagem de dono usa `private.is_band_owner` internamente.
* **Referência viva + duplicar**: editar um repertório compartilhado por N shows afeta todos eles (inclusive shows passados). "Duplicar para este show" (`duplicateSetlistForGig`) cria uma cópia independente (nome "<nome> (cópia)") e anexa só a esse show. Se qualquer passo falhar, a cópia é apagada e o show continua com o repertório original. Limite conhecido: não é uma única transação de banco (são várias chamadas; um erro entre a criação e o rollback pode, no pior caso, deixar uma cópia órfã).
* **Biblioteca de repertórios da banda** (`/repertorio`, `components/band-setlists.tsx`): lista os repertórios da banda com selo "Principal" (visível a todos); criar repertório e "Tornar principal" só aparecem para donos da banda. `/repertorio/lista/[id]` também abre repertórios da banda (dono edita, qualquer membro lê). Repertórios `scope='band'` são legíveis por qualquer membro da banda (RLS) — escrita continua só dono. A antiga seção "Repertório dos próximos shows" foi removida de `/repertorio` (a escolha agora é feita dentro de cada show).
* **Link público completo** (`/s/[token]`, `components/public-setlist-view.tsx`): mostra música, artista, tom, observação, nota de passagem, cifra colada e PDF anexado — sem login, sem nenhuma ação de edição. PDFs usam `getPublicSongPdfUrl`, que valida pelo token (não por sessão de membro).
* **Compartilhamento por WhatsApp**: botão ao lado de "Copiar link" (`components/gig-setlist.tsx`, na tela do show e na biblioteca), abre `https://api.whatsapp.com/send?text=...` (app no celular, WhatsApp Web no desktop).
* Desvio aceito: na tela do show sem repertório, "Criar um repertório novo" leva a `/repertorio` (onde se cria e depois se anexa) em vez de criar um repertório vazio ali mesmo.
* Substitui os trechos do §16 e do §22 sobre "um [repertório] por show" e sobre o link público mostrar só ordem e tom.

## 36. Item "Indicações" na navegação (placeholder)
* `components/navigation.tsx` e `components/mobile-nav.tsx` têm um item "Indicações" (ícone Gift) antes de "Perfil", desabilitado: não clicável, com tooltip "Em breve". É só um marcador da futura página de indicações (o crédito por indicação já existe no backend, ver §18). Não tem `data-tour-nav`, então o tour guiado nunca o mira.

## 37. Cobrança pelo Stripe (cartão, mensal e anual)
* **Planos:** um produto "GigOps Banda" no Stripe com três preços: R$ 49,90/mês, R$ 24,90/mês (Fundador, só para as primeiras `FOUNDER_LIMIT` = 50 bandas, para sempre) e R$ 499,00/ano (cerca de R$ 41,60/mês, cobrado de uma vez). O plano Solo foi descartado: o preço é o mesmo para todos (a coluna `price_plan = 'solo'` continua no banco, sem uso). IDs dos preços em `STRIPE_PRICE_*` (§8). Pix no Stripe Brasil é "somente por convite", então por ora só cartão.
* **Checkout:** o Perfil (dono) mostra "Assinar por R$ …/mês" e "Assinar por R$ 499,00/ano" quando a banda não está ativa. `startCheckout(period)` em `app/profile/actions.ts` decide **no servidor** o preço mensal (`monthlyPlan` em `lib/pricing.ts`: Fundador enquanto houver vaga ou se a banda já é Fundadora), cria/reaproveita o cliente Stripe (`subscriptions.stripe_customer_id`) e abre um Checkout hospedado. O `band_id` e o plano vão em `subscription_data.metadata`. Não usa `requireOwner` de propósito: banda expirada precisa poder pagar.
* **Webhook:** `POST /api/stripe/webhook` (`app/api/stripe/webhook/route.ts`, público no `proxy`, protegido pela assinatura do Stripe). Eventos: `checkout.session.completed`, `customer.subscription.updated`, `customer.subscription.deleted` (o destino também recebe `invoice.payment_failed`, ignorado: o acesso acaba sozinho quando `paid_until` vence). O payload só diz *qual* assinatura mudou; `syncSubscription` (`lib/stripe.ts`) lê o estado atual no Stripe e grava `status` (ativa/expirada), `paid_until` (fim do período), `billing_period`, os ids Stripe e, se o plano era Fundador, `price_plan = 'founder'`. Reentrega ou eventos fora de ordem convergem para o mesmo estado.
* **Gerenciar:** `openBillingPortal()` abre o portal do cliente do Stripe (trocar cartão, ver faturas, cancelar no fim do período). "Alternar planos" está **desligado** no portal de propósito: uma banda de R$ 49,90 poderia trocar sozinha para o preço Fundador.
* **Banco:** `supabase/migrations/20260924000000_stripe.sql` (colunas `stripe_customer_id` e `stripe_subscription_id`, únicas). Aplicar antes de subir.
* **Go-live:** aplicar a migração; definir as 5 variáveis na Vercel; no Stripe, o destino de webhook `gigueiros-assinaturas` aponta para `https://gigueiros.com.br/api/stripe/webhook` (sem `www`: o `www` redireciona com 308 e o Stripe não segue redirecionamento). A conta Stripe está em modo live (sem sandbox): para testar sem cobrar de verdade, use um cupom de 100% (o checkout aceita códigos promocionais) ou reembolse depois.
* **Teste grátis preservado:** quem assina durante os 7 dias de teste mantém os dias restantes: `startCheckout` passa `trial_end` (o fim do teste) ao Checkout e o Stripe só cobra quando ele acaba. O Checkout exige `trial_end` a pelo menos 48h; com menos que isso o restante do teste é descartado. Enquanto a assinatura está em `trialing` no Stripe, o app a trata como ativa, com `paid_until` no fim do teste.
* **Termos de uso** (`app/termos/page.tsx`): descrevem cobrança mensal e anual, renovação automática, cancelamento pelo portal e reembolso integral em até 7 dias da primeira cobrança (o arrependimento do CDC, art. 49). É uma política de negócio: ajuste o texto se mudar o prazo.
* **URL base:** `NEXT_PUBLIC_SITE_URL` (Vercel) é `https://gigueiros.com.br`, o domínio sem `www` (o `www` redireciona). Ela vale para o retorno do Checkout e do portal.

## 28. Prévia de link (WhatsApp) e CTA da landing
* `app/opengraph-image.tsx` gera a thumb de compartilhamento. O `proxy.ts` (auth) redirecionava `/opengraph-image` para `/login`, então os crawlers (WhatsApp etc.) recebiam HTML e não mostravam imagem; a rota agora está excluída do `matcher`. Depois do deploy, o WhatsApp pode manter o cache antigo do link por um tempo (testar com um link novo, ex.: `?v=2`).
* Landing: a seção de preço ganhou um segundo botão "Testar 7 dias grátis" e, no card de Fundadores, o texto sobre o grupo de suporte direto com o criador.

## 38. Cadastro pelo Google voltava pra landing page sem erro
* **Sintoma:** "Continuar com Google" abria o consentimento normalmente, mas depois a pessoa caía na landing page (`/`) sem sessão, sem conta finalizada e sem nenhuma mensagem de erro.
* **Causa:** a Redirect URL allow list do Supabase Auth estava com `https://www.gigueiros.com.br/*`. No matcher de globs do Supabase, `*` **não** atravessa `/` — quem faz isso é `**`. Logo `/*` casa com `/login`, mas **não** com `/auth/callback` (dois segmentos). Como o `redirect_to` não passava na allow list, o GoTrue descartava ele e caía no fallback: a **Site URL**, que é a landing page. O `?code=` chegava em `/` e ninguém trocava ele por sessão — daí o silêncio. O usuário até era criado em `auth.users`, mas o cadastro no app nunca era concluído (nenhuma banda, nenhum `band_members`).
* **Correção no Supabase (obrigatória):** trocar todas as entradas da allow list de `/*` para `/**` (§10).
* **Correção no código (defesa em profundidade, pra nunca mais falhar calado):**
  * `lib/supabase/middleware.ts`: requisição em `/` com `?code=` ou `?error=` é redirecionada pra `/auth/callback` preservando a query. Mesmo que o Supabase volte pro fallback da Site URL, o login termina (o cookie do code verifier do PKCE é do mesmo domínio, então a troca funciona).
  * `app/auth/callback/route.ts`: passa a logar (`console.error`) tanto a falha de `exchangeCodeForSession` quanto o erro devolvido pelo provedor, e o `motivo` mandado pra `/login` agora vem de `error_code` (legível por máquina, é o que a página compara) em vez de `error_description`.
* **Limitação conhecida:** se o GoTrue devolver o erro no *fragmento* (`/#error=...`, fluxo implícito), o servidor não consegue ler — hoje o app usa PKCE, onde o erro vem na query string.

## 39. Tema como external store e limpeza do lint
* `lib/theme.ts` centraliza a escolha claro/escuro (`localStorage.theme` + classe `dark` no `<html>`) como um external store: `getTheme`/`getServerTheme`/`subscribeTheme`/`setTheme`. `components/theme-toggle.tsx` e `components/theme-toaster.tsx` leem por `useSyncExternalStore` em vez de copiar o valor pro state dentro de um `useEffect` (que renderizava duas vezes e quebrava a regra `react-hooks/set-state-in-effect` do Next 16).
  * `getServerTheme()` devolve `null`: no servidor e no primeiro render do cliente ninguém sabe o que está no `localStorage`, então o toggle não desenha nada até hidratar — é o que substitui o antigo flag `mounted`.
  * `setTheme()` grava, aplica a classe e avisa os listeners na hora. O evento `storage` só dispara nas *outras* abas, e é por isso que o `theme-toaster` pôde perder o `MutationObserver` que existia só pra perceber o toggle mexendo na classe na mesma aba.
  * A semântica continua a mesma do script anti-FOUC em `app/layout.tsx`: qualquer valor diferente de `'light'` é escuro.
* `components/profile-client.tsx`: `Notification.permission` também virou `useSyncExternalStore` (snapshot de servidor `'idle'`), com um `override` local pros estados que os botões da própria tela definem (`loading`/`active`/`idle`/`denied`).
* Tipos que eram `any`: `components/dashboard-client.tsx` ganhou o tipo `MonthRow` pro mapa mensal do gráfico de linhas (chaves de projeto achatadas na linha, como o Recharts exige) e o `formatter` do Tooltip recebe `unknown`; `app/actions/gig-actions.ts` lê o título do show embutido com o mesmo padrão de `bandOfLineup` (objeto ou array de um item).
* `npm run lint` agora passa sem erros **e sem warnings**.

## 40. Formato do código de convite / indicação
* **Um código só, dois usos.** Cada banda tem um `bands.invite_code`. Ele serve pra (a) um músico entrar na banda e (b) ser usado como *código de indicação* por outra banda na hora de criar a conta — nesse caso a banda dona do código ganha 30 dias grátis (`grantReferralCredit` em `lib/bands.ts`).
* **Formato:** até **5 caracteres alfanuméricos** (`[A-Z0-9]`), sem espaços, acentos, pontuação ou hífen. Guardado em maiúsculas.
  * Gerado automaticamente pra banda nova: `upper(substr(md5(random()::text), 1, 5))` — ou seja, 5 dígitos hexadecimais maiúsculos (`0-9`, `A-F`), tipo `A1B2C`.
  * O dono pode trocar por um código próprio no Perfil (`saveInviteCode`): 1 a 5 caracteres, letras e/ou números, obrigatório nem ser só letras nem só números. Números são permitidos, não obrigatórios.
  * Unicidade é global e **sem distinção de maiúsculas/minúsculas** (índice único em `upper(invite_code)`).
* **Onde encontrar:** Perfil da banda, campo "Código de convite da banda". É esse valor que se digita no campo de indicação de outra conta.
* **O campo de indicação não cria código.** Ele só aceita o código de uma banda **que já existe**. Digitar um código inventado devolve "Não existe banda com o código X..." e o cadastro da banda não acontece — o campo é opcional, então o caminho é deixar vazio.
* **Correções feitas junto (busca de código):**
  * As buscas por código usavam `.eq('invite_code', code)`, que é *case-sensitive*, enquanto a unicidade no banco é `upper(invite_code)` — um código gravado em minúsculas (possível nas linhas migradas de `go_settings`, copiadas sem `upper()`) era impossível de achar. Agora todas usam `.ilike()` com `%`/`_` escapados (`normalizeCode`/`codeFilter` em `lib/bands.ts`), em `createBandFor`, `joinBandByCode`, `signup` e `saveInviteCode`.
  * `maxLength` dos campos de código subiu de 5 pra 12 (onboarding, login e Perfil): bandas migradas de `go_settings` podem ter um código legado mais longo que 5 (o default antigo era o texto fixo `SEIS4-MVP`), e com o limite em 5 o campo truncava a digitação e o código *válido* voltava como inválido. A validação de verdade é do servidor.
  * `saveInviteCode` passou a dar `trim()` antes de validar (um espaço colado junto dava "máximo 5 caracteres alfanuméricos", que não explicava nada).
  * Mensagens de erro agora dizem o que o código é, onde achar e o formato; o placeholder do login era `Ex: BANDA2026`, que mentia sobre o tamanho, e virou `Ex: A1B2C`. O campo de convite no login também virou `required` (antes, vazio, ele ia pro servidor e voltava com erro genérico).
