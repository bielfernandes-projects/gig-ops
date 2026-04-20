# 📘 Documentação Oficial: Minha Banda (GigOps)

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

* **Músico Convidado (Viewer):**
  * Visualiza apenas a própria realidade. Não vê os cachês dos colegas nem o lucro da empresa.
  * O painel financeiro exibe exclusivamente o "Meu Cachê" (soma dos valores nos shows em que está escalado).
  * Não visualiza o bloco de "Observações" do contratante.
  * Possui link de calendário exclusivo para sincronizar apenas os shows nos quais foi escalado.

---

## 4. Estrutura de Banco de Dados (PostgreSQL)
A fundação de dados do sistema (Supabase) está estruturada nas seguintes tabelas principais:

* **`go_profiles`**: Gerencia a autenticação e as roles (`admin` ou `viewer`).
* **`go_projects`**: Os "produtos" da banda (ex: Baile, Casamento, Acústico), definindo cores para o calendário.
* **`go_members`**: O banco de talentos/músicos da banda. Cruza com o e-mail do `go_profiles` para identificar quem está logado. Possui a coluna `calendar_token` para geração de links privados.
* **`go_gigs`**: A tabela central de eventos. Guarda Título, Horário (ISO UTC), Endereço, Valor Bruto, Observações, Custo de Som (`sound_cost`) e Status do Som (`is_sound_paid`).
* **`go_lineup`**: Tabela relacional de escala. Conecta um `member` a uma `gig`, definindo sua função (instrumento), valor do cachê (`fee_amount`) e status (`pago` / `pendente`).
* **`go_push_subscriptions`**: Armazena as assinaturas de dispositivos para o envio de notificações push.
* **`go_settings`**: Configurações globais da banda (Código de Convite e Token Global do iCal).

---

## 5. Funcionalidades Core (Regras de Negócio)

### 5.1. Gestão de Agenda e Escala
* **Criação de Gigs:** Admins definem data via componente de Calendário interativo e selecionam horários e local.
* **Escala de Músicos:** Admins selecionam membros do banco de talentos, definindo o cachê de cada um para aquele evento específico.
* **Cópia Rápida de Logística:** Botão na Home que extrai Título, Data, Horário e Local para a área de transferência, omitindo as observações privadas.
* **Duplicação de Gigs:** Funcionalidade que permite clonar todos os dados de uma Gig existente (Logística, Custos de Som, Observações, etc.) para um novo evento, agilizando turnês e shows recorrentes.
* **Cancelamento com Notificação:** A exclusão de um show exige o preenchimento de um motivo obrigatório, que é disparado via Push Notification para toda a lineup escalada.
* **Cópia de E-mail para Gestão:** Na aba Perfil (Gestão de Banda), admins podem copiar o e-mail de novos músicos registrados para facilitar a atualização de seus dados no banco de talentos.

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

### 5.4. Notificações Push (Web Push)
* **Gatilho de Escala:** Quando o Admin salva a escala, o servidor dispara uma notificação via biblioteca `web-push` (VAPID) diretamente para o dispositivo cadastrado do músico.
* **Gatilho de Cancelamento:** Ao cancelar um show com justificativa, todos os músicos impactados recebem o motivo em real-time.
* **Aviso de Novo Cadastro:** Admins são notificados sempre que um novo usuário entra na plataforma utilizando o código de convite da banda.

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

---

## 7. Fluxos de Operação (Manuais)

* **Adição de Novo Músico:** Admin cadastra o músico com e-mail real -> Músico cria conta -> O sistema vincula automaticamente.
* **Pagamento de Som:** Realizado no modal da Gig ou na página de detalhes, impactando diretamente o cálculo de pendências e lucro realizado.
