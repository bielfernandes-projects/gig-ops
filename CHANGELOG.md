# Changelog

Formato baseado em [Keep a Changelog](https://keepachangelog.com/pt-BR/1.1.0/) e versionamento [SemVer](https://semver.org/lang/pt-BR/).

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
