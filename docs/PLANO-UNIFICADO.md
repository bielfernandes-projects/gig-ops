# Gigueiros: plano unificado (Gestão + Repertório)

Documento de decisão. Nada aqui foi implementado ainda. Objetivo: transformar o Gigueiros no app completo da banda e do músico freelancer, incorporando o que o Set Sync faz de repertório, sem herdar o que ele tem de risco (raspagem, motor de sync offline).

## 1. Decisões fechadas

| Tema | Decisão |
|---|---|
| Produto | Um único app (Next.js, Supabase em São Paulo, um login) com dois módulos: **Gestão** e **Repertório**. |
| Fonte de cifra | **Sem raspagem.** Link para a fonte externa, mais texto colado ou PDF/imagem anexado pelo músico. |
| Ponto eletrônico (palco em tempo real) | **Fora** do escopo por enquanto. |
| Offline | Só **leitura** dos próximos shows. Edição exige internet. Sem motor de sync bidirecional. |
| Assinatura | Presa à **banda**. Quem paga é um dos donos; os demais membros usam sem pagar. |
| Donos | Uma banda pode ter **vários donos com direitos iguais**. Não existe papel "editor" separado. |
| Multi-banda | Uma pessoa pode ser dona de uma banda e membro de outra. |
| Catálogo | É da **banda**. Membros podem adicionar músicas a ele. |
| Repertório oficial do show | Só **donos** montam. Membros criam repertórios **pessoais** (só eles veem). |
| Link de show | Quem recebe só o link (sem conta) **visualiza** aquele repertório e nada mais. |
| Trial | 7 dias com os dois módulos liberados. |
| Preços | Plano **Banda** (completo) R$ 49,90/mês. **Fundadores**: as 50 primeiras bandas pagam R$ 24,90 com o preço travado enquanto a assinatura estiver ativa. Detalhes e dúvidas em aberto na seção 4. |

Posicionamento frente ao Meu Cachê (R$ 19,90 por pessoa; uma banda de 5 paga ~R$ 99,50/mês lá): aqui **a banda paga uma vez e todos usam**.

## 2. Papéis e identidade

Três tipos de acesso:

| Acesso | Como entra | O que faz |
|---|---|---|
| **Dono** (owner) | Cria a banda ou é promovido por outro dono | Tudo: financeiro, membros, convites, repertório oficial, assinatura, exclusão |
| **Membro** (member) | Código ou link de convite da banda | Vê a agenda e **só o próprio cachê**; vê os repertórios dos shows em que está escalado; cria repertórios pessoais; adiciona músicas ao catálogo da banda |
| **Convidado por link** | Link de um repertório (sem login) | Só lê aquele repertório |

Regras que já existem e continuam: membro nunca vê cachê dos colegas nem observações do contratante.

## 3. Modelo de dados

### 3.1 Núcleo (substitui o `admin_id` como "dono do tenant")

- `bands`: `id`, `name`, `invite_code` (único), `calendar_token`, `created_at`.
- `band_members`: `band_id`, `user_id`, `role` (`owner` | `member`), `created_at`. Chave `(band_id, user_id)`.
- `profiles` (hoje `go_profiles`): passa a guardar só dados da pessoa (`id`, `email`, `display_name`). O papel deixa de ficar no perfil, porque agora é por banda.
- `subscriptions` (uma por banda): `band_id`, `module_gestao bool`, `module_repertorio bool`, `status` (`trial` | `active` | `expired`), `trial_ends_at`, `paid_until`, `billing_period` (`monthly` | `annual`).
- `go_members` (o "banco de talentos" da banda) continua existindo: nem todo músico da lista tem conta. Ganha `user_id` opcional, preenchido quando a pessoa entra na banda com o mesmo e-mail.

### 3.2 Migração sem reescrever dados
Hoje cada banda é um admin (`admin_id` = id do usuário). Ao criar `bands`, usamos **`bands.id` = id do admin atual**. Assim todas as linhas existentes (`go_gigs`, `go_projects`, `go_members`, `go_settings`) só precisam renomear `admin_id` para `band_id`, sem mudar valores. Os admins atuais viram `owner` e os viewers (`invited_by`) viram `member`.

### 3.3 Segurança (RLS)
Funções auxiliares em schema `private`, no mesmo estilo das atuais:
- `is_band_owner(band_id)` e `is_band_member(band_id)`.
- Escrita em gigs, projetos, membros, lineup e financeiro: só `owner`.
- Leitura de gigs e lineup: dono vê tudo; membro vê só os shows em que está escalado (como hoje, agora por banda).
- Toda política de assinatura consulta `subscriptions` para saber se o módulo está liberado.

### 3.4 Módulo Repertório

- `songs`: `id`, `band_id` (nulo se pessoal), `owner_user_id` (preenchido se pessoal), `scope` (`band` | `personal`), `title`, `artist`, `original_key`, `bpm`, `source_url` (link do Cifra Club, etc.), `chart_text` (cifra ou letra colada pelo músico), `documents` (metadados de PDF/imagem no Storage), `created_by`.
- `setlists`: `id`, `band_id`, `scope` (`band` | `personal`), `owner_user_id` (se pessoal), `gig_id` (opcional; um show tem 0 ou 1 repertório oficial), `name`.
- `blocks`: `setlist_id`, `name`, `theme`, `position`.
- `block_songs`: `block_id`, `song_id`, `requested_key`, `reference_key` (tom original no momento da inclusão), `note`, `transition_note`, `position`.
- `setlist_share_links`: `id`, `setlist_id`, `token`, `revoked_at`. Sempre somente leitura.

Regras:
- Repertório **de banda**: só donos editam; membros escalados no show leem.
- Repertório **pessoal**: só o dono do repertório vê e edita. Pode usar músicas do catálogo da banda e músicas pessoais. Repertório de banda usa só músicas da banda.
- Catálogo da banda: qualquer membro insere; só quem criou (ou um dono) edita ou apaga.
- Arquivos: bucket privado no Storage com URL assinada. Limite por música e por banda (custo).
- Link de show: função no servidor lê pelo `token` e devolve só ordem, tons, observações e o texto da cifra. Nunca expõe cachê, contratante ou dados da banda.

### 3.5 Melhorias de Gestão (vindas da comparação com o Meu Cachê)
- `go_gigs.event_type`: tipo de evento (casamento, bar, corporativo, etc.), para relatórios por tipo.
- `gig_expenses`: `gig_id`, `category`, `description`, `amount`. Lucro previsto passa a considerar despesas além do som.
- Cachê parcial: `gig_payments` (`gig_id`, `amount`, `paid_at`, `note`) para o que o contratante paga (sinal e restante); e o mesmo conceito para o pagamento a cada músico.
- Confirmação de presença: `lineup.confirmation` (`pending` | `confirmed` | `declined`).
- Conflito de agenda: consulta que cruza os shows de **todas as bandas** de uma pessoa no mesmo horário.
- "Meus cachês" entre bandas: painel do usuário somando o que ele tem a receber em cada banda em que está.
- Rateio do lucro entre sócios: percentual por dono, calculado no relatório do show.

## 4. Planos, preço e cobrança

### 4.1 Vitrine
Duas opções no lançamento, para não confundir:

| Plano | Para quem | Preço (a validar com as bandas) |
|---|---|---|
| **Banda** (Gestão + Repertório) | Donos e membros ilimitados na banda | **R$ 49,90/mês** (anual com desconto) |
| **Solo** | Freelancer usando sozinho (agenda, cachês e repertório pessoais) | por volta de **R$ 19,90/mês** (o concorrente individual cobra o mesmo; ficar abaixo do preço de fundador da banda, R$ 24,90, mantém a escada de preços coerente) |

O modular (só Gestão ou só Repertório) fica **adiado**: a tabela `subscriptions` já guarda os direitos por módulo, então dá para liberar depois sem refazer nada.

- **Trial:** 7 dias, com tudo liberado. Sem cartão. (Público-alvo são bandas médias/grandes com frequência alta de shows — várias por semana —, então um ciclo completo de show já acontece dentro do teste.)
- **Fim do trial ou atraso:** dados preservados; o app fica somente leitura. Nada é apagado.
- **Direito de arrependimento:** 7 dias para compra online (CDC). O processo de reembolso precisa existir.

### 4.2 Programa de fundadores
As **50 primeiras bandas** pagam **R$ 24,90/mês** (cerca de 50% de desconto sobre R$ 49,90) no plano Banda e recebem:
- **Preço travado enquanto a assinatura estiver ativa.** Se cancelar, perde o preço de fundador. Não prometer "acesso vitalício".
- **Todos os módulos incluídos**, inclusive os que ainda vão nascer (o Repertório).
- Acesso a um **grupo restrito** de feedback e interação.

Regras para não dar problema:
- **Contador de vagas real**, lido do banco. Nunca fingir escassez.
- **Termos claros:** o que é o preço de fundador, quando se perde, e que o grupo é um canal de feedback e não um suporte com prazo.
- **O R$ 49,90 precisa ser um preço praticado de verdade** depois das 50 vagas. Validar o valor com as primeiras bandas antes de cravar na vitrine.
- **Grupo:** regras fixas e um horário semanal reservado para ele, para não consumir todo o seu tempo.

### 4.3 Gateway de pagamento
Recomendação: **Stripe** (Checkout + Billing + portal do cliente + webhooks atualizando `subscriptions`). Taxas conferidas nas páginas oficiais em setembro/2026:

| Opção | Taxa | Sobre R$ 24,90 | Sobre R$ 49,90 |
|---|---|---|---|
| Stripe (cartão + Billing) | 3,99% + R$ 0,39 + 0,7% | ~R$ 1,56 (6,3%) | ~R$ 2,73 (5,5%) |
| Kiwify | 8,99% + R$ 2,49 | ~R$ 4,73 (19%) | ~R$ 6,98 (14%) |
| Asaas | cartão 2,99% + R$ 0,49; Pix R$ 1,99 fixo | | |

- O Stripe aceita **CPF** (não exige CNPJ) e tem reembolso pelo painel.
- **Limite:** Pix no Stripe Brasil é "somente por convite". Pedir acesso; enquanto isso, o plano **anual** pode ser pago por Pix manual.
- A Kiwify seria a escolha se a indicação em **dinheiro** virar prioridade, porque ela calcula e paga os afiliados. O custo é a taxa mais alta e um produto pensado para venda de cursos.

### 4.4 Programa de indicação
**Por crédito, não em dinheiro.** Quando uma banda indicada paga o primeiro mês, quem indicou ganha **1 mês grátis** (desconto na próxima fatura), com teto anual. Cada banda tem um link `?ref=`. Sem repasse para pessoas, sem retenção de imposto.
Se no futuro quiserem comissão em dinheiro, avaliar migrar a cobrança para uma plataforma com afiliados.

### 4.5 Custos fixos de operação (confirmar valores atuais)
- **Vercel Pro:** o plano gratuito (Hobby) é para uso não comercial; cobrar exige o Pro (na casa de US$ 20/mês).
- **Supabase Pro:** na casa de US$ 25/mês, com backups e mais Storage.
- Somando os dois, umas 10 a 12 bandas no preço de fundador (R$ 24,90) já cobrem os custos. Confirmar o câmbio e os valores atuais.
- Tributação e abertura de MEI/CNPJ: consultar um contador quando o volume crescer.

## 5. O que reaproveitar do Set Sync

| Reaproveitar | Descartar |
|---|---|
| Lógica de transposição de tom (`computeSemitoneShift`, mapa de notas) e os testes | Scraper do Cifra Club e cache global de cifras (ADR 0009) |
| Modelo Setlist / Bloco / Item de Bloco, tom solicitado, tom de referência e drift | Motor de sync offline bidirecional (`merge`, tombstones, `localStorage` como fonte de verdade) |
| Ideias de tela: visão de palco, letra grande, alto contraste, tela sempre ligada | Billing próprio (Appmax, limites de plano, admin) |
| Glossário do `CONTEXT.md` | i18n PT/EN, ponto eletrônico em tempo real |

Novo, a construir: um interpretador de cifra **colada pelo usuário** (distinguir linha de acorde de linha de letra e transpor). O parser atual é específico do HTML do Cifra Club e não serve.

## 6. Fases de entrega

**Fase 0: base (antes de qualquer feature nova)**
1. Migração para `bands` + `band_members` + `subscriptions`, mantendo os ids atuais.
2. RLS e ações do servidor trocando "admin" por "dono da banda".
3. Seletor de banda na interface (quem participa de mais de uma) e convite de co-dono.
4. Bloqueio por assinatura (módulos e trial).

**Fase 1: Gestão melhor** (paridade e diferenciais)
Tipo de evento e relatórios, despesas do show, cachê parcial, confirmação de presença e conflito de agenda, "Meus cachês" entre bandas.

**Fase 2: Repertório MVP**
Catálogo da banda (texto colado, PDF, link), repertório do show com blocos e tom solicitado, link somente leitura, visão de palco, leitura offline dos próximos shows.

**Fase 3: complementos**
Transposição sobre o texto colado, repertórios pessoais, rateio entre sócios, recibo em PDF, programa de indicação.

Regra de ouro: só entrar na próxima fase quando a anterior estiver em uso real com as bandas de teste.

## 7. Riscos e pontos em aberto

- **Fase 0 mexe em tudo** (banco, RLS, ações, telas). Fazer com backup e teste de isolamento por perfil, como na migração para São Paulo.
- **Custo de Storage:** PDFs pesam. Definir limites por banda antes de liberar anexos.
- **Conteúdo de terceiros:** o texto colado é do usuário, mas o app precisa de termos de uso claros (o usuário responde pelo que cola) e um canal para remoção.
- **Convidado por link:** o token precisa ser longo e revogável; nunca previsível.
- **Custo de infra:** ver seção 4.5. O Supabase gratuito tem limites de banco e de Storage, e a Vercel Hobby não permite uso comercial.
- **Concorrência:** o Meu Cachê já existe, é individual e mais simples. A vantagem a explorar é "a banda inteira no mesmo lugar" e o repertório amarrado ao show.
