-- Fase 2 do plano unificado: modulo Repertorio (catalogo da banda, repertorio do show, link publico).
-- Aplicada no Supabase via MCP em 2026-09-22. Sem raspagem: o texto da cifra e colado pelo proprio musico.

create table public.songs (
  id uuid primary key default gen_random_uuid(),
  band_id uuid not null references public.bands(id) on delete cascade,
  title text not null,
  artist text,
  original_key text,
  bpm integer check (bpm is null or (bpm > 0 and bpm <= 400)),
  source_url text,
  chart_text text,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index idx_songs_band on public.songs (band_id);

create table public.setlists (
  id uuid primary key default gen_random_uuid(),
  band_id uuid not null references public.bands(id) on delete cascade,
  gig_id uuid references public.go_gigs(id) on delete set null,
  name text not null,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create unique index setlists_gig_key on public.setlists (gig_id) where gig_id is not null;
create index idx_setlists_band on public.setlists (band_id);

create table public.blocks (
  id uuid primary key default gen_random_uuid(),
  setlist_id uuid not null references public.setlists(id) on delete cascade,
  name text not null,
  theme text,
  position integer not null default 0
);
create index idx_blocks_setlist on public.blocks (setlist_id);

create table public.block_songs (
  id uuid primary key default gen_random_uuid(),
  block_id uuid not null references public.blocks(id) on delete cascade,
  song_id uuid not null references public.songs(id) on delete cascade,
  reference_key text,
  requested_key text,
  note text,
  transition_note text,
  position integer not null default 0
);
create index idx_block_songs_block on public.block_songs (block_id);
create index idx_block_songs_song on public.block_songs (song_id);

create table public.setlist_share_links (
  id uuid primary key default gen_random_uuid(),
  setlist_id uuid not null references public.setlists(id) on delete cascade,
  token text not null unique default replace(gen_random_uuid()::text || gen_random_uuid()::text, '-', ''),
  created_at timestamptz not null default now(),
  revoked_at timestamptz
);
create index idx_share_links_setlist on public.setlist_share_links (setlist_id);

create or replace function private.can_read_setlist(sid uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from setlists s
    where s.id = sid
      and (private.is_band_owner(s.band_id) or (s.gig_id is not null and s.gig_id in (select private.my_gig_ids_v2())))
  )
$$;
create or replace function private.owns_setlist(sid uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from setlists s where s.id = sid and private.is_band_owner(s.band_id))
$$;
grant execute on function private.can_read_setlist(uuid), private.owns_setlist(uuid) to authenticated;

alter table public.songs enable row level security;
alter table public.setlists enable row level security;
alter table public.blocks enable row level security;
alter table public.block_songs enable row level security;
alter table public.setlist_share_links enable row level security;

create policy songs_select on public.songs for select to authenticated using (private.is_band_member(band_id));
create policy songs_insert on public.songs for insert to authenticated
  with check (private.is_band_member(band_id) and created_by = auth.uid());
create policy songs_update on public.songs for update to authenticated
  using (private.is_band_owner(band_id) or created_by = auth.uid())
  with check (private.is_band_owner(band_id) or created_by = auth.uid());
create policy songs_delete on public.songs for delete to authenticated
  using (private.is_band_owner(band_id) or created_by = auth.uid());

create policy setlists_select on public.setlists for select to authenticated using (private.can_read_setlist(id));
create policy setlists_write on public.setlists for all to authenticated
  using (private.is_band_owner(band_id)) with check (private.is_band_owner(band_id));

create policy blocks_select on public.blocks for select to authenticated using (private.can_read_setlist(setlist_id));
create policy blocks_write on public.blocks for all to authenticated
  using (private.owns_setlist(setlist_id)) with check (private.owns_setlist(setlist_id));

create policy block_songs_select on public.block_songs for select to authenticated
  using (private.can_read_setlist((select b.setlist_id from public.blocks b where b.id = block_id)));
create policy block_songs_write on public.block_songs for all to authenticated
  using (private.owns_setlist((select b.setlist_id from public.blocks b where b.id = block_id)))
  with check (private.owns_setlist((select b.setlist_id from public.blocks b where b.id = block_id)));

create policy share_links_owner on public.setlist_share_links for all to authenticated
  using (private.owns_setlist(setlist_id)) with check (private.owns_setlist(setlist_id));

-- o token do link publico so o servidor le
revoke select on public.setlist_share_links from authenticated;
grant select (id, setlist_id, created_at, revoked_at) on public.setlist_share_links to authenticated;
