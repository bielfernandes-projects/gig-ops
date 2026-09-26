-- Aplicada no Supabase em 2026-09-26 (a primeira tentativa falhou na politica reminders_admin,
-- criada pelo painel e fora das migrations; ver o passo 1).
-- A limpeza que a fase 0 deixou pra depois (ver o cabeçalho de 20260922000000_fase0_bands.sql):
-- as políticas antigas, por "tenant do admin", conviviam com as novas, por banda. Políticas
-- permissivas se somam com OR, então as antigas só alargavam o acesso — nenhum dono de banda
-- dependia delas, e é por isso que dropá-las não fecha porta de ninguém.
--
-- O que sai daqui: políticas antigas, as três funções private legadas, a coluna admin_id (com o
-- trigger que a sincronizava com band_id) e a tabela go_settings, cujos dados já viraram linhas em
-- `bands` e continuam em backup_fase0.go_settings.
--
-- Roda quantas vezes precisar: tudo é `if exists` e a varredura do passo 1 não acha nada na segunda
-- vez.
--
-- FORA DAQUI, DE PROPÓSITO: go_profiles.role e go_profiles.invited_by. A trigger
-- public.handle_new_user() (criada pelo painel, fora das migrations) pode gravar nessas colunas —
-- se gravar, dropá-las faz todo cadastro novo falhar com "Database error saving new user". Elas
-- saem numa migration seguinte, junto com a versão revisada da função.

-- 1. Políticas do modelo antigo. As equivalentes por banda foram criadas em
--    20260922000000_fase0_bands.sql, e existe uma pra cada tabela varrida aqui — nada fica
--    descoberto. As nomeadas abaixo vieram das migrations; a varredura pega as que foram criadas
--    direto pelo painel e não estão versionadas em lugar nenhum (foi o caso de `reminders_admin`,
--    em go_reminders, que dependia de go_gigs.admin_id).
drop policy if exists profiles_select on public.go_profiles;   -- vale profiles_band_select
drop policy if exists projects_select on public.go_projects;   -- vale projects_band_select
drop policy if exists projects_write  on public.go_projects;   -- vale projects_band_write
drop policy if exists members_select  on public.go_members;    -- vale members_band_select
drop policy if exists members_write   on public.go_members;    -- vale members_band_write
drop policy if exists gigs_select     on public.go_gigs;       -- vale gigs_band_select
drop policy if exists gigs_write      on public.go_gigs;       -- vale gigs_band_write
drop policy if exists lineup_select   on public.go_lineup;     -- vale lineup_band_select
drop policy if exists lineup_write    on public.go_lineup;     -- vale lineup_band_write

do $$
declare p record;
begin
  for p in
    select tablename, policyname
    from pg_policies
    where schemaname = 'public'
      -- Só tabelas que já têm política equivalente por banda. go_push_subscriptions fica de fora
      -- de propósito: a política dela é por usuário e não tem substituta.
      and tablename in ('go_projects', 'go_members', 'go_gigs', 'go_lineup', 'go_reminders')
      and (
        -- `my_gig_ids()` com os parênteses, pra não casar com a nova `my_gig_ids_v2()`.
        coalesce(qual, '') || ' ' || coalesce(with_check, '') like '%admin_id%'
        or coalesce(qual, '') || ' ' || coalesce(with_check, '') like '%is_admin()%'
        or coalesce(qual, '') || ' ' || coalesce(with_check, '') like '%tenant_id()%'
        or coalesce(qual, '') || ' ' || coalesce(with_check, '') like '%my_gig_ids()%'
      )
  loop
    execute format('drop policy %I on public.%I', p.policyname, p.tablename);
    raise notice 'política legada removida: % em %', p.policyname, p.tablename;
  end loop;
end $$;

-- 2. Funções do modelo antigo. is_admin() lia go_profiles.role e já retornava false pra todo dono
--    de banda criado depois da fase 0 — uma armadilha pra qualquer política nova que a usasse.
--    Vem depois do passo 1 porque as políticas removidas acima dependiam delas.
drop function if exists private.my_gig_ids();
drop function if exists private.is_admin();
drop function if exists private.tenant_id();

-- 3. admin_id: band_id é a coluna de verdade desde a fase 0, e nada no app lê admin_id.
drop trigger if exists sync_band_admin on public.go_projects;
drop trigger if exists sync_band_admin on public.go_members;
drop trigger if exists sync_band_admin on public.go_gigs;
drop function if exists private.sync_band_admin();

alter table public.go_projects drop column if exists admin_id;
alter table public.go_members  drop column if exists admin_id;
alter table public.go_gigs     drop column if exists admin_id;

-- 4. go_settings: os invite_code/calendar_token viraram colunas de `bands` na fase 0, e o backup
--    segue em backup_fase0.go_settings (schema sem acesso pela API).
drop table if exists public.go_settings;
