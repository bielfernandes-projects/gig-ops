-- Telemetria simples do produto: telas visitadas e ações-chave, pro painel em /admin.
-- Escrita só pelo servidor (service role); nada aqui é lido ou escrito pelo cliente.
create table public.app_events (
  id bigserial primary key,
  -- `set null` nas duas: apagar um usuário ou uma banda não apaga o histórico de uso.
  user_id uuid references auth.users(id) on delete set null,
  band_id uuid references public.bands(id) on delete set null,
  kind text not null check (kind in ('screen', 'action')),
  -- Tela (caminho já normalizado, ex. /gigs/:id) ou nome da ação (ex. gig_criado).
  name text not null,
  created_at timestamptz not null default now()
);
create index app_events_created_idx on public.app_events (created_at desc);
create index app_events_kind_name_idx on public.app_events (kind, name);

alter table public.app_events enable row level security; -- sem policy nenhuma: só o service role
revoke all on public.app_events from anon, authenticated;

-- Agregações pro painel. O cliente JS do Supabase não faz GROUP BY, e trazer as linhas cruas pra
-- somar em JavaScript não escala. São `security definer` (leem app_events e auth.users, que o
-- cliente não alcança) e o EXECUTE é revogado de todo mundo menos o service_role — o `revoke ... from
-- public` sozinho tiraria o acesso do service_role também, daí o grant explícito depois.
-- Nomes de saída com prefixo (event_kind, event_name) de propósito: iguais aos das colunas, o corpo
-- da função fica ambíguo pro Postgres.

create or replace function public.admin_event_counts(p_days int default 30)
returns table (event_kind text, event_name text, total bigint, distinct_users bigint)
language sql stable security definer set search_path = public as $$
  select e.kind, e.name, count(*)::bigint, count(distinct e.user_id)::bigint
  from public.app_events e
  where e.created_at > now() - make_interval(days => p_days)
  group by e.kind, e.name
  order by count(*) desc
$$;

create or replace function public.admin_signups_by_day(p_days int default 30)
returns table (day date, total bigint)
language sql stable security definer set search_path = public as $$
  select u.created_at::date, count(*)::bigint
  from auth.users u
  where u.created_at > now() - make_interval(days => p_days)
  group by u.created_at::date
  order by u.created_at::date
$$;

-- Contas e quantas delas voltaram nos últimos 30 dias (o "eles usam?" mais direto que existe).
create or replace function public.admin_user_totals()
returns table (total bigint, active_30d bigint)
language sql stable security definer set search_path = public as $$
  select count(*)::bigint,
         count(*) filter (where u.last_sign_in_at > now() - interval '30 days')::bigint
  from auth.users u
$$;

revoke execute on function public.admin_event_counts(int), public.admin_signups_by_day(int),
  public.admin_user_totals() from public, anon, authenticated;
grant execute on function public.admin_event_counts(int), public.admin_signups_by_day(int),
  public.admin_user_totals() to service_role;
