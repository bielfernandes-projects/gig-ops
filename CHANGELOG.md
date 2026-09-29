# Changelog

Formato baseado em [Keep a Changelog](https://keepachangelog.com/pt-BR/1.1.0/) e versionamento [SemVer](https://semver.org/lang/pt-BR/).

## [Não lançado]

### Adicionado
- Aviso "Premium desbloqueado" para o Dono, uma vez, quando a banda vira Premium (por assinatura, painel admin ou banco). Migration `20260929000000_premium_seen.sql`.
- Importação de repertório por PDF, DOCX ou TXT: leitura por IA (Gemini), prévia editável, filtro das músicas com nome/tom/artista faltando, cria as músicas no catálogo e um repertório com os blocos. Requer `GEMINI_API_KEY`.

## [1.0.0] - 2026-09
Primeira versão numerada, correspondente ao app em produção desde o go-live.

### Adicionado
- Versão do app visível no rodapé da landing, na tela de login e no fim da tela de Perfil.
- `CHANGELOG.md` e `lib/version.ts` (fonte única da versão: `package.json`).
