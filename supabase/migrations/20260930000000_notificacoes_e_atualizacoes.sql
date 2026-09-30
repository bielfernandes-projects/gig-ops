-- Sino de notificações dentro do app + "Atualizações do app" lançadas pelo painel /admin.
-- Não aplicada ainda: aplicar primeiro na homologação, depois em produção, ANTES de subir o código.

-- Notificações de cada pessoa (escalada, pagamento, lembrete...). Antes só existiam como push e não
-- ficavam guardadas. O app grava uma linha por aviso, a partir da aplicação desta migration (sem histórico).
-- Sem policies de propósito: só o servidor (service role) lê e escreve, sempre filtrando pelo próprio usuário.
create table if not exists public.user_notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  kind text not null,
  title text not null,
  body text not null default '',
  url text,
  read_at timestamptz,
  created_at timestamptz not null default now()
);
create index if not exists idx_user_notifications_user on public.user_notifications (user_id, created_at desc);
alter table public.user_notifications enable row level security;

-- Atualizações do produto (novidades, melhorias, bugs corrigidos), lançadas à mão no painel /admin.
-- `published_at` é a data exibida (o admin escolhe); `created_at` é quando foi lançada e decide
-- se a pessoa já viu (assim uma atualização com data retroativa também aparece no pop-up).
create table if not exists public.app_updates (
  id uuid primary key default gen_random_uuid(),
  kind text not null check (kind in ('funcionalidade', 'melhoria', 'bug')),
  title text not null,
  body text not null,
  published_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);
create index if not exists idx_app_updates_published on public.app_updates (published_at desc);
alter table public.app_updates enable row level security;

-- Quando a pessoa fechou o pop-up de atualizações pela última vez. O default now() faz contas novas
-- começarem "em dia" (só veem o que for lançado depois do cadastro) e as contas existentes também
-- (a coluna nova já nasce com now() nelas): ninguém recebe o histórico antigo de uma vez.
alter table public.go_profiles add column if not exists updates_seen_at timestamptz not null default now();
