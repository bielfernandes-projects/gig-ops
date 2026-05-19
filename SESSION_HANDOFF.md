# Session Handoff — Minha Banda

## Stack de Autenticação

| Camada | Tecnologia | Versão |
|--------|-----------|--------|
| Auth Provider | Supabase | ^2.103.2 |
| SSR | @supabase/ssr | ^0.10.2 |
| Runtime | Next.js (App Router) | 16.2.3 |

---

## Visão Geral do Fluxo

```
                     ┌────────────────────────────────┐
                     │         proxy.ts                │
                     │  (Next.js Proxy/Middleware)     │
                     │  - Intercepta todas as reqs     │
                     │  - Chama updateSession()        │
                     │  - Troca código PKCE            │
                     │  - Renova sessão                │
                     │  - Redireciona não-auth p/login │
                     └──────────┬─────────────────────┘
                                │
              ┌─────────────────┼──────────────────┐
              ▼                 ▼                   ▼
   ┌─────────────────┐ ┌──────────────┐ ┌──────────────────┐
   │  Server Client  │ │ Browser Client│ │  Supabase Admin  │
   │  lib/supabase/  │ │ lib/supabase/ │ │  lib/supabase.ts │
   │  server.ts      │ │ client.ts     │ │  (service role)  │
   └────────┬────────┘ └──────┬───────┘ └────────┬─────────┘
            │                 │                   │
            ▼                 ▼                   ▼
     Server Components    Client Components    Server Actions
     API Routes           useEffects            push notifications
     Server Actions
```

---

## Arquivos Envolvidos

| Arquivo | Função |
|---------|--------|
| `proxy.ts` | Entrypoint do middleware Next.js — delega para `updateSession()` |
| `lib/supabase/middleware.ts` | Lógica de renovação de sessão + proteção de rotas |
| `lib/supabase/server.ts` | Cria cliente Supabase no servidor (Server Components, Server Actions, Route Handlers) |
| `lib/supabase/client.ts` | Cria cliente Supabase no browser (Client Components, effects) |
| `lib/auth.ts` | Helper unificado `getUserInfo()` — auth + profile + member em paralelo |
| `lib/supabase.ts` | Cliente Supabase direto (para queries que não dependem de sessão, ex: mocks) |
| `app/login/page.tsx` | Página de login/cadastro/esqueci senha |
| `app/login/actions.ts` | Server Actions: `login()`, `signup()`, `forgotPassword()`, `signout()` |
| `app/auth/reset-password/page.tsx` | Página de redefinição de senha (após click no email) |
| `app/api/me/route.ts` | Route handler — retorna `{ id }` do usuário logado ou 401 |

---

## Fluxos Detalhados

### 1. Login (`/login`)

```
[Usuário] → preenche email + senha → clica "Entrar"
  │
  ▼
LoginPage (cliente) → handleSubmit()
  │
  ├─ chama Server Action: login(formData)
  │    │
  │    ├─ createClient() → lib/supabase/server.ts
  │    │    └─ Lê cookies da request via headers()
  │    │
  │    ├─ supabase.auth.signInWithPassword({ email, password })
  │    │    └─ Supabase valida credenciais
  │    │    └─ Retorna session (access_token + refresh_token)
  │    │
  │    ├─ Cookies são setados automaticamente pelo createServerClient
  │    │
  │    └─ redirect('/') → Next.js faz redirect
  │
  ▼
Proxy (Middleware) intercepta o redirect
  │
  ├─ updateSession() → supabase.auth.getUser()
  │    └─ Valida session nos cookies
  │    └─ Se válido: deixa passar
  │    └─ Se inválido: redireciona p/ /login
  │
  └─ Usuário chega em / → redireciona p/ /dashboard (next.config.ts)
```

### 2. Cadastro / Signup (`/login`, modo cadastro)

```
[Usuário] → preenche email + senha + código de convite → clica "Registrar"
  │
  ▼
LoginPage (cliente) → handleSubmit() (isLogin = false)
  │
  ├─ Valida checklist de senha (isPasswordValid)
  │    └─ Botão só habilita se TODAS as regras forem cumpridas
  │
  ├─ Chama Server Action: signup(formData)
  │    │
  │    ├─ Valida invite_code em go_settings
  │    ├─ supabase.auth.signUp({ email, password, options.emailRedirectTo })
  │    │    └─ Cria usuário em auth.users (confirmado = false)
  │    │    └─ Envia email de confirmação com link
  │    │
  │    ├─ sendPushToAdmins() — notificação push (fire & forget)
  │    │
  │    └─ Retorna { success: true }
  │
  └─ Página mostra tela de sucesso:
     "Enviamos um link de confirmação para o seu e-mail"
```

**Nota:** O signup não cria sessão automaticamente. O usuário precisa
clicar no link de confirmação do email para ativar a conta.

### 3. Confirmação de Email

```
[Usuário] → clica link no email
  │
  ▼
Link: {origin}/login#access_token=xxx&refresh_token=yyy&type=signup
  │
  ▼
Proxy (Middleware)
  │
  ├─ updateSession() → supabase.auth.getUser()
  │    └─ Detecta PKCE code na URL
  │    └─ Troca code por session
  │    └─ Salva session nos cookies (setAll)
  │
  └─ Página /login renderiza com sessão ativa
       └─ middleware redireciona p/ /dashboard (user autenticado em rota auth)
```

### 4. Esqueci Senha → Reset de Senha

```
[Usuário] → clica "Esqueci a senha" → digita email
  │
  ▼
LoginPage → handleForgotSubmit()
  │
  ├─ Server Action: forgotPassword(formData)
  │    │
  │    ├─ supabase.auth.resetPasswordForEmail(email, {
  │    │     redirectTo: "${origin}/auth/reset-password"
  │    │   })
  │    │
  │    └─ Supabase envia email com link PKCE
  │
  ▼
[Usuário] → abre email → clica no link
  │
  ▼
Link: {origin}/auth/reset-password?code=xxx
  │
  ▼
Proxy (Middleware)
  │
  ├─ updateSession() → supabase.auth.getUser()
  │    └─ Detecta ?code=xxx na URL
  │    └─ Troca code por session PKCE
  │    └─ Salva session nos cookies
  │
  ▼
ResetPasswordPage (cliente) — useEffect()
  │
  ├─ 1. Tenta supabase.auth.getSession()
  │    └─ Se sessão existe (trocada pelo middleware): OK
  │
  ├─ 2. Se não: extrai code da URL (query string ou hash)
  │    └─ supabase.auth.exchangeCodeForSession(code)
  │    └─ Fallback manual caso middleware não tenha trocado
  │
  ├─ Exibe formulário de nova senha
  │    └─ PasswordStrengthIndicator abaixo do input
  │    └─ Botão "Salvar" só habilita quando TODAS as regras OK
  │
  ├─ handleSubmit()
  │    └─ Valida senha + confirmação
  │    └─ supabase.auth.updateUser({ password })
  │    └─ toast.success → redirect('/login')
  │
  └─ Usuário faz login com a nova senha
```

### 5. Logout

```
[Navegação] → (fluxo futuro de botão de logout)
  │
  ▼
Server Action: signout()
  │
  ├─ supabase.auth.signOut()
  │    └─ Limpa session no Supabase
  │    └─ Cookies são limpos pelo createServerClient
  │
  └─ redirect('/login')
```

Atualmente o `signout()` está definido em `app/login/actions.ts` mas
não há botão de logout visível na UI.

---

## Proteção de Rotas (Middleware)

### `proxy.ts` → `lib/supabase/middleware.ts`

```
Toda request → proxy()
  │
  ├─ Cria Supabase Server Client com cookies da request
  ├─ Chama supabase.auth.getUser()
  │    └─ Se URL contém ?code=xxx: troca código PKCE automaticamente
  │    └─ Se session expirada: tenta refresh automático
  │
  ├─ Rota é pública? (pathname.startsWith('/login') || '/auth/reset-password')
  │    ├─ SIM: deixa passar
  │    └─ NÃO + sem usuário: redirect /login
  │
  └─ Rota é pública + tem usuário?
       ├─ SIM: redirect /dashboard (não mostrar login p/ quem já logou)
       └─ NÃO: deixa passar
```

### Rotas Públicas
- `/login` e subrotas
- `/auth/reset-password`
- `/api/calendar/[token]` (não interceptado — não tem match no proxy? Verificar)

### Rotas Protegidas (exigem sessão)
- `/dashboard`
- `/agenda`
- `/gigs/[id]`
- `/members`
- `/projects`
- `/profile`
- `/api/me`

---

## Helpers de Autenticação

### `lib/auth.ts` — `getUserInfo()`

Helper unificado que substitui `getUserRole()` + `getUserEmail()`:
```
getUserInfo()
  │
  ├─ createClient() → lib/supabase/server.ts
  │    └─ Lê cookies via headers()
  │
  ├─ supabase.auth.getUser()
  │    └─ Se não user: { role: 'viewer', email: undefined, memberId: null }
  │
  ├─ Promise.all([  ← paralelo obrigatório
  │     go_profiles.select('role').eq('id', user.id).single()
  │     go_members.select('id').eq('email', email).single()
  │   ])
  │
  └─ { role, email, memberId }
```

Usado em:
- `app/dashboard/page.tsx` — Server Component (import direto)
- Outros Server Components protegidos

### `lib/supabase/server.ts` — `createClient()`

Server Client usado em Server Actions e Server Components.
- Lê cookies via `cookies()` do Next.js headers
- Usa `createServerClient` do `@supabase/ssr`

### `lib/supabase/client.ts` — `createClient()`

Browser Client usado em Client Components.
- Usa `createBrowserClient` do `@supabase/ssr`
- Lê/escreve cookies do browser via `getAll()`/`setAll()`
- Usado em `app/auth/reset-password/page.tsx`

### `lib/supabase.ts` — `supabase` (instância direta)

Cliente Supabase sem gerenciamento de sessão SSR.
Usado para queries que não dependem de auth (ex: dashboard carregar gigs).
⚠️ Usa anon key — respeita Row Level Security do Supabase.

---

## Considerações Importantes

### PKCE Flow
O Supabase SSR usa PKCE (Proof Key for Code Exchange) para links de
email (confirmação de signup, reset de senha). O código vem na URL como
`?code=xxx` e é trocado por uma sessão.

O middleware tenta trocar automaticamente via `getUser()`. Se falhar,
a página `reset-password` tem fallback manual com `exchangeCodeForSession()`.

### Cookies vs LocalStorage
O `@supabase/ssr` usa cookies em vez de localStorage para armazenar
tokens. Isso permite que o servidor leia a sessão.

### Fluxo de Redirect pós-login
O `login()` action chama `redirect('/')`, e o `next.config.ts` redireciona
`/` → `/dashboard`. O middleware também protege: se o user está logado
e tenta acessar `/login`, redireciona para `/dashboard`.

### Password Strength (Supabase)
O Supabase foi configurado para exigir:
- Mínimo 8 caracteres
- 1 letra maiúscula
- 1 letra minúscula
- 1 número
- 1 caractere especial

O front-end reflete essas regras via `PasswordStrengthIndicator.tsx`
e bloqueia o submit até todas serem cumpridas.

### Regras de Desenvolvimento (GEMINI.md)
- **Sempre usar `getUserInfo()`** para dados de auth — nunca chamar
  `getUserRole()` ou `getUserEmail()` separadamente
- **`Promise.all` obrigatório** para queries independentes — sem waterfall
- Rodar `npm run lint` e `npx next build` antes de finalizar tarefas

---

## Iteração 24 — Relacionamento Direto (PK/FK) e Fluxo "Criar Minha Banda"

### Resumo das Mudanças

| Arquivo | Mudança |
|---------|---------|
| `lib/auth.ts` | `UserInfo` agora retorna `userId` (UUID do usuário autenticado) |
| `lib/types.ts` | Adicionado `admin_id?: string` em `GoGig`, `GoMember`, `GoProject` |
| `app/agenda/page.tsx` | Gigs e Projects filtrados por `admin_id` (admin) |
| `app/dashboard/page.tsx` | Gigs filtrados por `admin_id` (admin) |
| `app/gigs/[id]/page.tsx` | Members e Projects filtrados por `admin_id` (admin) |
| `app/members/page.tsx` | Members filtrados por `admin_id` (admin) |
| `app/projects/page.tsx` | Projects filtrados por `admin_id` (admin) |
| `app/profile/page.tsx` | Gigs filtrados por `admin_id` (admin) |
| `app/actions/gig-actions.ts` | `addQuickGig`, `updateGig`, `cancelGig` — autenticação + `admin_id` |
| `app/actions/member-actions.ts` | `addMember`, `updateMember` — autenticação + `admin_id` |
| `app/actions/project-actions.ts` | `addProject`, `updateProject` — autenticação + `admin_id` |
| `app/login/actions.ts` | Nova action `adminSignup()` — cria auth user + `go_profiles` com `role='admin'` |
| `app/login/page.tsx` | Botão "Criar Minha Banda" ativo, novo estado `isAdminSignup` |
| `app/login/LoginClient.tsx` | **Removido** (arquivo órfão duplicado) |
| `.env` | Fix: `EXT_PUBLIC_SUPABASE_URL` → `NEXT_PUBLIC_SUPABASE_URL` |

### Checklist da Iteração

- [x] `admin_id` inserido ao criar Gigs, Membros, Projetos
- [x] SELECTs filtrados por `admin_id` em todas as telas de admin
- [x] Botão "Criar Minha Banda" ativo no fluxo de signup
- [x] `adminSignup()` cria conta + perfil com `role='admin'`
- [x] Ownership verificado em updates/deletes
- [x] `LoginClient.tsx` deletado
- [x] Build TypeScript passou sem erros

### Observações
- **Viewers:** Não têm filtro `admin_id` — continuam vendo dados via `go_lineup` (regra mantida).
- **Calendar API (`/api/calendar/[token]`):** Não alterado — usa service_role key diretamente (token-based auth, não session).
- **Query pattern:** Para evitar TypeScript issues com `let` + Supabase query builder, páginas isoladas (members, projects) usam ternário inline com `await` direto. Pages com `Promise.all` mantêm `let` + cast.
