-- Fase 3: musicas e repertorios pessoais (so quem os cria ve; dentro de uma banda, sem expor aos demais).
-- Aplicada no Supabase via MCP em 2026-09-22.

alter table public.songs add column scope text not null default 'band' check (scope in ('band', 'personal'));
alter table public.songs add column owner_user_id uuid references auth.users(id) on delete cascade;
alter table public.songs add constraint songs_personal_owner check (scope = 'band' or owner_user_id is not null);

alter table public.setlists add column scope text not null default 'band' check (scope in ('band', 'personal'));
alter table public.setlists add column owner_user_id uuid references auth.users(id) on delete cascade;
alter table public.setlists add constraint setlists_personal_owner check (scope = 'band' or owner_user_id is not null);
create index idx_setlists_owner on public.setlists (owner_user_id) where owner_user_id is not null;

create or replace function private.can_read_setlist(sid uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from setlists s
    where s.id = sid
      and case s.scope
        when 'personal' then s.owner_user_id = auth.uid() and private.is_band_member(s.band_id)
        else private.is_band_owner(s.band_id) or (s.gig_id is not null and s.gig_id in (select private.my_gig_ids_v2()))
      end
  )
$$;
create or replace function private.owns_setlist(sid uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from setlists s
    where s.id = sid
      and case s.scope
        when 'personal' then s.owner_user_id = auth.uid() and private.is_band_member(s.band_id)
        else private.is_band_owner(s.band_id)
      end
  )
$$;

drop policy songs_select on public.songs;
drop policy songs_insert on public.songs;
drop policy songs_update on public.songs;
drop policy songs_delete on public.songs;
create policy songs_select on public.songs for select to authenticated
  using (private.is_band_member(band_id) and (scope = 'band' or owner_user_id = auth.uid()));
create policy songs_insert on public.songs for insert to authenticated
  with check (private.is_band_member(band_id) and created_by = auth.uid()
    and (scope = 'band' or owner_user_id = auth.uid()));
create policy songs_update on public.songs for update to authenticated
  using ((scope = 'band' and (private.is_band_owner(band_id) or created_by = auth.uid())) or (scope = 'personal' and owner_user_id = auth.uid()))
  with check ((scope = 'band' and (private.is_band_owner(band_id) or created_by = auth.uid())) or (scope = 'personal' and owner_user_id = auth.uid()));
create policy songs_delete on public.songs for delete to authenticated
  using ((scope = 'band' and (private.is_band_owner(band_id) or created_by = auth.uid())) or (scope = 'personal' and owner_user_id = auth.uid()));

drop policy setlists_write on public.setlists;
create policy setlists_write on public.setlists for all to authenticated
  using ((scope = 'band' and private.is_band_owner(band_id)) or (scope = 'personal' and owner_user_id = auth.uid() and private.is_band_member(band_id)))
  with check ((scope = 'band' and private.is_band_owner(band_id)) or (scope = 'personal' and owner_user_id = auth.uid() and private.is_band_member(band_id)));
