-- A limpeza que a fase 0 deixou pra depois (ver o cabeçalho de 20260922000000_fase0_bands.sql):
-- as políticas antigas, por "tenant do admin", conviviam com as novas, por banda. Políticas
-- permissivas se somam com OR, então as antigas só alargavam o acesso — nenhum dono de banda
-- dependia delas, e é por isso que dropá-las não fecha porta de ninguém.
--
-- O que sai daqui: políticas antigas, as três funções private legadas, a coluna admin_id (com o
-- trigger que a sincronizava com band_id) e a tabela go_settings, cujos dados já viraram linhas em
-- `bands` e continuam em backup_fase0.go_settings.
--
-- FORA DAQUI, DE PROPÓSITO: go_profiles.role e go_profiles.invited_by. A trigger
-- public.handle_new_user() (criada pelo painel, fora das migrations) pode gravar nessas colunas —
-- se gravar, dropá-las faz todo cadastro novo falhar com "Database error saving new user". Elas
-- saem numa migration seguinte, junto com a versão revisada da função.

-- 1. Políticas antigas (as equivalentes por banda foram criadas em 20260922000000_fase0_bands.sql)
drop policy if exists profiles_select on public.go_profiles;   -- vale profiles_band_select
drop policy if exists projects_select on public.go_projects;   -- vale projects_band_select
drop policy if exists projects_write  on public.go_projects;   -- vale projects_band_write
drop policy if exists members_select  on public.go_members;    -- vale members_band_select
drop policy if exists members_write   on public.go_members;    -- vale members_band_write
drop policy if exists gigs_select     on public.go_gigs;       -- vale gigs_band_select
drop policy if exists gigs_write      on public.go_gigs;       -- vale gigs_band_write
drop policy if exists lineup_select   on public.go_lineup;     -- vale lineup_band_select
drop policy if exists lineup_write    on public.go_lineup;     -- vale lineup_band_write

-- 2. Funções do modelo antigo. is_admin() lia go_profiles.role e já retornava false pra todo dono
--    de banda criado depois da fase 0 — uma armadilha pra qualquer política nova que a usasse.
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
