-- Tipos de conta: Banda (equipe, escala, despesas) e Freela (uma pessoa, sem equipe).
-- Contas existentes viram 'banda' (nada muda para ninguém). Aditiva e idempotente.
alter table public.bands add column if not exists kind text not null default 'banda';
alter table public.bands drop constraint if exists bands_kind_check;
alter table public.bands add constraint bands_kind_check check (kind in ('banda', 'freela'));

-- Cota mensal de importações por IA (gigs + repertório somados). Nulo = padrão do app (20);
-- o painel /admin pode dar folga a uma conta específica.
alter table public.subscriptions add column if not exists import_quota int check (import_quota is null or import_quota >= 0);

-- Leituras bem-sucedidas por conta e mês (mês de Brasília, 'YYYY-MM'). Só o servidor (service role) lê e escreve.
create table if not exists public.import_usage (
  band_id uuid not null references public.bands(id) on delete cascade,
  month text not null,
  count int not null default 0,
  primary key (band_id, month)
);
alter table public.import_usage enable row level security;
revoke all on public.import_usage from anon, authenticated;

-- Soma 1 de forma atômica e devolve o total do mês.
create or replace function public.bump_import_usage(p_band uuid, p_month text)
returns int language sql security definer set search_path = public as $$
  insert into public.import_usage (band_id, month, count) values (p_band, p_month, 1)
  on conflict (band_id, month) do update set count = public.import_usage.count + 1
  returning count;
$$;
revoke execute on function public.bump_import_usage(uuid, text) from public, anon, authenticated;
grant execute on function public.bump_import_usage(uuid, text) to service_role;
