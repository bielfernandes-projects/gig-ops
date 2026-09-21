-- Fase 0 do plano unificado: bandas com membros e papeis (dono | membro) e assinatura por banda.
-- ADITIVA: admin_id continua existindo (sincronizado com band_id por trigger) e as politicas antigas
-- seguem valendo. A limpeza (drop de admin_id, go_settings e politicas antigas) fica para uma
-- migration posterior, depois que o codigo novo estiver estavel em producao.
-- Aplicada no Supabase via MCP em 2026-09-22 em cinco partes (backup, tabelas, colunas, politicas, privilegios).

-- 0. Backup dentro do proprio banco (schema privado, sem acesso pela API)
create schema if not exists backup_fase0;
create table backup_fase0.go_profiles as select * from public.go_profiles;
create table backup_fase0.go_settings as select * from public.go_settings;
create table backup_fase0.go_projects as select * from public.go_projects;
create table backup_fase0.go_members as select * from public.go_members;
create table backup_fase0.go_gigs as select * from public.go_gigs;
create table backup_fase0.go_lineup as select * from public.go_lineup;
create table backup_fase0.go_reminders as select * from public.go_reminders;
create table backup_fase0.go_push_subscriptions as select * from public.go_push_subscriptions;
revoke all on schema backup_fase0 from anon, authenticated;
revoke all on all tables in schema backup_fase0 from anon, authenticated;
alter table backup_fase0.go_profiles enable row level security;
alter table backup_fase0.go_settings enable row level security;
alter table backup_fase0.go_projects enable row level security;
alter table backup_fase0.go_members enable row level security;
alter table backup_fase0.go_gigs enable row level security;
alter table backup_fase0.go_lineup enable row level security;
alter table backup_fase0.go_reminders enable row level security;
alter table backup_fase0.go_push_subscriptions enable row level security;

-- 1. Tabelas novas
create table public.bands (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  invite_code text not null default upper(substr(md5(random()::text), 1, 5)),
  calendar_token uuid not null unique default gen_random_uuid(),
  created_at timestamptz not null default now()
);
create unique index bands_invite_code_key on public.bands (upper(invite_code));

create table public.band_members (
  band_id uuid not null references public.bands(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role text not null check (role in ('owner', 'member')),
  created_at timestamptz not null default now(),
  primary key (band_id, user_id)
);
create index band_members_user_idx on public.band_members (user_id);

create table public.subscriptions (
  band_id uuid primary key references public.bands(id) on delete cascade,
  status text not null default 'trial' check (status in ('trial', 'active', 'expired')),
  trial_ends_at timestamptz not null default (now() + interval '30 days'),
  paid_until timestamptz,
  module_gestao boolean not null default true,
  module_repertorio boolean not null default true,
  price_plan text not null default 'standard' check (price_plan in ('standard', 'founder', 'solo')),
  billing_period text check (billing_period in ('monthly', 'annual')),
  created_at timestamptz not null default now()
);

alter table public.bands enable row level security;
alter table public.band_members enable row level security;
alter table public.subscriptions enable row level security;

-- Backfill: cada admin atual vira uma banda com o MESMO id
insert into public.bands (id, name, invite_code, calendar_token)
select s.admin_id, initcap(s.invite_code), s.invite_code, s.calendar_token from public.go_settings s where s.admin_id is not null;

insert into public.band_members (band_id, user_id, role)
select p.id, p.id, 'owner' from public.go_profiles p where p.role = 'admin' and exists (select 1 from public.bands b where b.id = p.id);

insert into public.band_members (band_id, user_id, role)
select p.invited_by, p.id, 'member' from public.go_profiles p
where p.role = 'viewer' and p.invited_by is not null and exists (select 1 from public.bands b where b.id = p.invited_by)
on conflict do nothing;

insert into public.subscriptions (band_id, status, trial_ends_at, paid_until)
select s.admin_id, s.subscription_status, s.trial_ends_at, s.paid_until from public.go_settings s where s.admin_id is not null;

-- 2. band_id ao lado de admin_id
alter table public.go_projects add column band_id uuid references public.bands(id) on delete cascade;
alter table public.go_members  add column band_id uuid references public.bands(id) on delete cascade;
alter table public.go_gigs     add column band_id uuid references public.bands(id) on delete cascade;

update public.go_projects set band_id = admin_id where band_id is null;
update public.go_members  set band_id = admin_id where band_id is null;
update public.go_gigs     set band_id = admin_id where band_id is null;

create index idx_go_projects_band_id on public.go_projects (band_id);
create index idx_go_members_band_id  on public.go_members (band_id);
create index idx_go_gigs_band_id     on public.go_gigs (band_id);

alter table public.go_projects drop constraint if exists go_projects_admin_id_fkey;
alter table public.go_members  drop constraint if exists go_members_admin_id_fkey;
alter table public.go_gigs     drop constraint if exists go_gigs_admin_id_fkey;

create schema if not exists private;
create or replace function private.sync_band_admin() returns trigger
language plpgsql set search_path = public as $$
begin
  if new.band_id is null then new.band_id := new.admin_id; end if;
  if new.admin_id is null then new.admin_id := new.band_id; end if;
  return new;
end $$;

create trigger sync_band_admin before insert or update on public.go_projects for each row execute function private.sync_band_admin();
create trigger sync_band_admin before insert or update on public.go_members  for each row execute function private.sync_band_admin();
create trigger sync_band_admin before insert or update on public.go_gigs     for each row execute function private.sync_band_admin();

alter table public.go_members add column user_id uuid references auth.users(id) on delete set null;
update public.go_members m set user_id = p.id from public.go_profiles p where m.email is not null and lower(p.email) = lower(m.email);
create index idx_go_members_user_id on public.go_members (user_id);

-- 3. Funcoes de acesso (SECURITY DEFINER, schema private) e politicas por banda
create or replace function private.is_band_member(b uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from band_members where band_id = b and user_id = auth.uid())
$$;
create or replace function private.is_band_owner(b uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from band_members where band_id = b and user_id = auth.uid() and role = 'owner')
$$;
create or replace function private.my_band_ids() returns setof uuid
language sql stable security definer set search_path = public as $$
  select band_id from band_members where user_id = auth.uid()
$$;
create or replace function private.my_gig_ids_v2() returns setof uuid
language sql stable security definer set search_path = public as $$
  select l.gig_id
  from go_lineup l
  join go_members m on m.id = l.member_id
  join go_gigs g on g.id = l.gig_id
  where g.band_id in (select band_id from band_members where user_id = auth.uid())
    and m.band_id = g.band_id
    and (m.user_id = auth.uid() or lower(m.email) = lower(auth.jwt() ->> 'email'))
$$;
create or replace function private.visible_profile_ids() returns setof uuid
language sql stable security definer set search_path = public as $$
  select bm.user_id from band_members bm
  where bm.band_id in (select band_id from band_members where user_id = auth.uid() and role = 'owner')
$$;
grant execute on function private.is_band_member(uuid), private.is_band_owner(uuid), private.my_band_ids(),
  private.my_gig_ids_v2(), private.visible_profile_ids() to authenticated;

create policy bands_select on public.bands for select to authenticated using (id in (select private.my_band_ids()));
create policy bands_update on public.bands for update to authenticated
  using (private.is_band_owner(id)) with check (private.is_band_owner(id));
create policy band_members_select on public.band_members for select to authenticated
  using (user_id = auth.uid() or private.is_band_owner(band_id));
create policy subscriptions_select on public.subscriptions for select to authenticated using (private.is_band_member(band_id));
create policy profiles_band_select on public.go_profiles for select to authenticated using (id in (select private.visible_profile_ids()));

create policy projects_band_select on public.go_projects for select to authenticated using (private.is_band_member(band_id));
create policy projects_band_write on public.go_projects for all to authenticated
  using (private.is_band_owner(band_id)) with check (private.is_band_owner(band_id));
create policy members_band_select on public.go_members for select to authenticated using (private.is_band_member(band_id));
create policy members_band_write on public.go_members for all to authenticated
  using (private.is_band_owner(band_id)) with check (private.is_band_owner(band_id));
create policy gigs_band_select on public.go_gigs for select to authenticated
  using (private.is_band_owner(band_id) or id in (select private.my_gig_ids_v2()));
create policy gigs_band_write on public.go_gigs for all to authenticated
  using (private.is_band_owner(band_id)) with check (private.is_band_owner(band_id));
create policy lineup_band_select on public.go_lineup for select to authenticated
  using (gig_id in (select id from public.go_gigs where private.is_band_owner(band_id)) or gig_id in (select private.my_gig_ids_v2()));
create policy lineup_band_write on public.go_lineup for all to authenticated
  using (gig_id in (select id from public.go_gigs where private.is_band_owner(band_id)))
  with check (gig_id in (select id from public.go_gigs where private.is_band_owner(band_id)));
create policy reminders_band on public.go_reminders for all to authenticated
  using (gig_id in (select id from public.go_gigs where private.is_band_owner(band_id)))
  with check (gig_id in (select id from public.go_gigs where private.is_band_owner(band_id)));

-- 4. Privilegios por coluna: calendar_token da banda so o servidor le; membros e assinaturas so o servidor escreve
revoke select on public.bands from authenticated;
grant select (id, name, invite_code, created_at) on public.bands to authenticated;
revoke update on public.bands from authenticated;
grant update (name, invite_code) on public.bands to authenticated;
revoke insert, update, delete on public.band_members from authenticated;
revoke insert, update, delete on public.subscriptions from authenticated;
