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
O sistema possui uma arquitetura de permissões focada em privacidade, com duas "visões" completamente distintas do mesmo aplicativo:

* **Administrador (Admin / Dono):**
  * Tem acesso irrestrito ao painel financeiro (receitas, despesas, lucro líquido).
  * Pode criar, editar e excluir Gigs (shows), Projetos e Membros.
  * Define os cachês individuais e gerencia o pagamento (baixa financeira) da equipe e do equipamento de som.
  * Tem acesso ao campo de "Observações" dos shows (dados sensíveis/contratuais).
  * Visualiza e gerencia a seção "Escala de Músicos" na página de detalhes do show (adicionar, editar cachê, remover, confirmar pagamento).

* **Músico Convidado (Viewer):**
  * Visualiza apenas a própria realidade. Não vê os cachês dos colegas nem o lucro da empresa.
  * O painel financeiro exibe exclusivamente o "Meu Cachê" (soma dos valores nos shows em que está escalado).
  * Não visualiza o bloco de "Observações" do contratante.
  * Visualiza os membros da escala na página do show (somente nome e instrumento, sem valores nem controles).
  * Não visualiza a seção "Escala de Músicos" (cabeçalho, badge de confirmados e botão de adicionar).

---

## 4. Estrutura de Banco de Dados (PostgreSQL)
A fundação de dados do sistema (Supabase) está estruturada nas seguintes tabelas principais:

* **`go_profiles`**: Gerencia a autenticação e as roles (`admin` ou `viewer`).
* **`go_projects`**: Os "produtos" da banda (ex: Baile, Casamento, Acústico), definindo cores para o calendário.
* **`go_members`**: O banco de talentos/músicos da banda. Cruza com o e-mail do `go_profiles` para identificar quem está logado. Possui a coluna `calendar_token` para geração de links privados.
* **`go_gigs`**: A tabela central de eventos. Guarda Título, Horário (ISO UTC), Endereço, Valor Bruto, Observações, Custo de Som (`sound_cost`), Status do Som (`is_sound_paid`), e `reminder_minutes` (array de minutos para lembretes push).
* **`go_lineup`**: Tabela relacional de escala. Conecta um `member` a uma `gig`, definindo sua função (instrumento), valor do cachê (`fee_amount`) e status (`pago` / `pendente`).
* **`go_push_subscriptions`**: Armazena as assinaturas de dispositivos para o envio de notificações push.
* **`go_settings`**: Configurações globais da banda (Código de Convite e Token Global do iCal).
* **`go_reminders`**: Lembretes push agendados. Cada registro armazena `gig_id`, `remind_at` (data/hora do disparo) e `sent` (status de envio).

---

## 5. Funcionalidades Core (Regras de Negócio)

### 5.1. Gestão de Agenda e Escala
* **Criação de Gigs:** Admins definem data via componente de Calendário interativo e selecionam horários e local.
* **Escala de Músicos:** Admins selecionam membros do banco de talentos via busca com autocomplete (digite para filtrar, clique para selecionar). Membros não cadastrados podem ser adicionados como "avulsos" (apenas para aquela gig).
* **Cópia Rápida de Logística:** Botão na Home que extrai Título, Data, Horário e Local para a área de transferência, omitindo as observações privadas.
* **Duplicação de Gigs:** Funcionalidade que permite clonar todos os dados de uma Gig existente (Logística, Custos de Som, Observações, etc.) para um novo evento, agilizando turnês e shows recorrentes.
* **Cancelamento com Notificação:** A exclusão de um show exige o preenchimento de um motivo obrigatório, que é disparado via Push Notification para toda a lineup escalada.
* **Cópia de E-mail para Gestão:** Na aba Perfil (Gestão de Banda), admins podem copiar o e-mail de novos músicos registrados para facilitar a atualização de seus dados no banco de talentos.
* **QuickAddGig Completo:** O modal de criação rápida agora inclui todos os campos: titulo, projeto, local, datas, valor bruto, equipamento de som (toggle + custo + responsavel), escala de musicos (seleção + cachê individual), repetição, observações e lembretes push.

### 5.1.1. Gestão de Membros (Equipe)
* **Cadastro:** Admins criam membros com nome, instrumento, WhatsApp (opcional) e e-mail (opcional). O e-mail vincula o membro ao login do app.
* **Edição:** Clique no card do membro para editar nome, instrumento, WhatsApp e e-mail.
* **Exclusão:** Botão de lixeira no card do membro (confirmação em dois cliques). Remove o membro do banco de talentos. Membros escalados em gigs anteriores permanecem no histórico da lineup.

### 5.2. Motor Financeiro e Pendências
* **Cálculo de Lucro Líquido:** O sistema calcula em tempo real o lucro do evento: `Lucro = Cachê Bruto - Custo do Som - Soma(Cachês da Lineup)`.
* **Diferenciação de Visão:** 
  * **Home (Próximos):** Exibe o Lucro Estimado (o que a banda "ainda vai ganhar").
  * **Perfil (Dashboard):** Exibe o Lucro Realizado (só entra no gráfico o que já foi marcado como 'Pago').
* **Motor de Pendências (Contas a Pagar):** 
  * O sistema varre eventos passados (`data < agora`).
  * Se houver músico pendente OU som não pago, o evento fica na seção amarela de **"Pendentes"** na Home.
  * Somente após o "check" financeiro total, o evento é arquivado visualmente (grayscale).

### 5.3. Sincronização de Calendário (iCal)
* **Geração Dinâmica:** Rotas API `/api/calendar/[token]` traduzem os dados para o padrão universal `.ics`.
* **Privacidade:** A exportação omite campos sensíveis como "Observações".
* **Assinatura Contínua:** Sincronização automática com Google Agenda, Apple Calendar e Outlook.
* **Adição por Gig:** Botão "Calendário" na página de detalhes do show e na Agenda permite baixar `.ics` individual ou abrir direto no Google Calendar.
* **Tokens Automáticos:** Admins recebem `calendar_token` ao criar conta; músicos recebem ao serem cadastrados.

### 5.4. Notificações Push (Web Push)
* **Gatilho de Escala:** Quando o Admin salva a escala, o servidor dispara uma notificação via biblioteca `web-push` (VAPID) diretamente para o dispositivo cadastrado do músico.
* **Gatilho de Cancelamento:** Ao cancelar um show com justificativa, todos os músicos impactados recebem o motivo em real-time.
* **Aviso de Novo Cadastro:** Admins são notificados sempre que um novo usuário entra na plataforma utilizando o código de convite da banda.

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

### 6.3. Segurança Nativa (RLS)
* **Row Level Security:** Camada de segurança ativa no PostgreSQL (Supabase). Se um usuário `viewer` tentar burlar o front-end e acessar a API diretamente para ver o cachê bruto de um show, o banco de dados bloqueia o retorno das colunas proibidas com base no ID do usuário autenticado.

### 6.4. Isolamento de Dados por Admin (admin_id)
* **Conceito:** As tabelas `go_gigs`, `go_members` e `go_projects` possuem a coluna `admin_id` (FK para `go_profiles.id`). Todo INSERT carimba o UUID do admin logado.
* **Filtro obrigatório:** SELECTs de admin são SEMPRE filtrados por `.eq('admin_id', userId)`. Viewers continuam vendo dados via `go_lineup`.
* **Server Actions:** Todas as actions de criação, atualização e exclusão verificam `admin_id` para garantir ownership.
* **Fluxo "Criar Minha Banda":** Novo admin se cadastra e já ganha um perfil com `role='admin'` em `go_profiles`, entrando em ambiente isolado.

---

## 7. Fluxos de Operação (Manuais)

* **Adição de Novo Músico:** Admin cadastra o músico com e-mail real -> Músico cria conta -> O sistema vincula automaticamente.
* **Pagamento de Som:** Realizado no modal da Gig ou na página de detalhes, impactando diretamente o cálculo de pendências e lucro realizado.
* **Configuração de Lembretes:** Ao criar uma gig, selecione os lembretes desejados. Configure um cron externo (ex: cron-job.org) para chamar `/api/cron/check-reminders` a cada 5-15 minutos com o header `Authorization: Bearer <CRON_SECRET>`.

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

## 11. Migração do Banco (go_reminders)

Execute o SQL abaixo no Supabase SQL Editor para criar a tabela de lembretes:

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

