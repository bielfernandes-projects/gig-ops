# Changelog

Formato baseado em [Keep a Changelog](https://keepachangelog.com/pt-BR/1.1.0/) e versionamento [SemVer](https://semver.org/lang/pt-BR/).

## [1.4.0] - 2026-10-01

### Alterado
- O push das "Atualizações do app" passou a ser **um por dia, às 8h de Brasília**, em vez de um por atualização lançada. Se nenhuma atualização foi lançada desde o último envio, nada é enviado. O texto do push muda de um dia para o outro (5 frases em rodízio). No painel `/admin/atualizacoes`, "Enviar push agora (só para urgência)" ficou desmarcado por padrão.
- Requer um job novo no agendador externo chamando `/api/cron/updates-push` às 8h de Brasília (11:00 UTC) com `Authorization: Bearer <CRON_SECRET>`. Migration `20261001000000_app_updates_push_diario.sql` (coluna `app_updates.push_sent_at`), já aplicada em homologação e produção.

## [1.3.0] - 2026-10-01

### Adicionado
- Cadastro pela landing: o botão "Criar conta" na barra superior e os botões "Testar 7 dias grátis" abrem direto o cadastro em `/login?cadastro=1`.
- "Continuar com Google" ao criar uma banda precisa só do nome da banda: ela é criada na volta do Google, sem passar pelo onboarding.
- Relatório: rosca de valores por projeto e linhas de gigs por projeto nos últimos 6 meses (as mesmas visões do Dashboard), com botões para ocultar projetos.
- Relógio circular para escolher o horário da gig (24h, qualquer minuto, modo teclado), no estilo do Google Agenda.
- Links de cifra (Cifra Club) e de letra (Letras.mus.br) sugeridos automaticamente a partir da música e do artista.

### Alterado
- Em `/login`, "Não tem conta?" abre primeiro "Criar minha banda"; "Fui convidado por uma banda" fica logo abaixo.
- Relatório mais colorido (KPIs, barras e gráficos) e o card "A receber de gigs já realizadas" virou um acordeão com o total e o detalhe de cada gig.
- "PDF da cifra" virou "Arquivos (partitura, cifra)" no texto do app, da landing e do tour (o envio continua só em PDF).
- Landing: alinhamentos e espaços ajustados (preço em uma linha, prints centralizados, carrossel em largura total) e folga à direita do quadro do topo no celular.

### Corrigido
- `sitemap.xml` e `robots.txt` eram redirecionados para o login (HTML) e o Search Console recusava o sitemap.
- O seletor de horário só aceitava minutos 00/15/30/45 e abria com fundo branco no modo escuro.

## [1.2.1] - 2026-09-30

### Alterado
- O pop-up de atualizações do app deixou de depender de login: o app checa sozinho a cada tela e sempre que volta para o primeiro plano (no máximo 1 vez por minuto), e o sino se atualiza ao voltar ao app e a cada 5 minutos.
- Ao lançar uma atualização em `/admin/atualizacoes`, dá para enviar também um push para todos os aparelhos inscritos (opção marcada por padrão).
- As mudanças da versão 1.2.0 foram lançadas como atualizações do app (dados, sem migration).

## [1.2.0] - 2026-09-30

### Adicionado
- Importação de gigs por planilha ou texto: cole a lista (Excel, Google Planilhas, WhatsApp) ou envie CSV, TXT, DOCX ou PDF; a IA (Gemini) lê data, horário de início e término, nome, cachê e a banda/projeto, com prévia editável antes de salvar. Projetos citados que não existem são criados e gigs duplicadas são ignoradas.
- Sino de notificações no Dashboard, com os avisos da pessoa (escala, pagamento, presença, cancelamento, lembretes) e a linha "Atualizações do app". Migration `20260930000000_notificacoes_e_atualizacoes.sql`.
- Pop-up "O que há de novo" no login quando há atualização nova, e módulo em `/admin/atualizacoes` para lançar atualizações (tipo, data, título e descrição).
- Ajuda e suporte em `/suporte`: FAQ e formulário que envia a mensagem por e-mail (Resend). Requer `RESEND_API_KEY`.
- "+ Novo projeto" direto no formulário de Nova Gig.
- Ícone do Instagram (@gigueirosapp) no menu e no rodapé da landing.
- Aviso na página Músicos, no modal e no tour: o e-mail do músico deve ser o mesmo do login para a gig aparecer na agenda dele.

### Alterado
- "Show" virou "gig" em todo o texto visível do app e da landing ("Nova Gig").
- Importação de repertório e de gigs compartilham o módulo de leitura por IA (`lib/gemini.ts`); avisos em bullets com o aviso do Google e a orientação de não enviar dados sensíveis.

## [1.1.0] - 2026-09-29

### Adicionado
- Versão do app também na tela de login.
- Seção na landing explicando a importação de repertório (envie o arquivo, revise, pronto no catálogo).
- Aviso "Premium desbloqueado" para o Dono, uma vez, quando a banda vira Premium (por assinatura, painel admin ou banco). Migration `20260929000000_premium_seen.sql`.
- Importação de repertório por PDF, DOCX ou TXT: leitura por IA (Gemini), prévia editável, filtro das músicas com nome/tom/artista faltando, cria as músicas no catálogo e um repertório com os blocos. Requer `GEMINI_API_KEY`.

## [1.0.0] - 2026-09
Primeira versão numerada, correspondente ao app em produção desde o go-live.

### Adicionado
- Versão do app visível no rodapé da landing, na tela de login e no fim da tela de Perfil.
- `CHANGELOG.md` e `lib/version.ts` (fonte única da versão: `package.json`).
