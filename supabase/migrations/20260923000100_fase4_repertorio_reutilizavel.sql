-- Fase 4 do plano unificado: repertorios reutilizaveis, repertorio principal e RLS de leitura mais aberta.

-- 1. Desacopla show de repertorio: a referencia passa a viver no show, nao no repertorio.
alter table public.go_gigs add column setlist_id uuid references public.setlists(id) on delete set null;

-- 2. Backfill: repertorios hoje presos a um show (1:1) viram a referencia do show.
update public.go_gigs g set setlist_id = s.id
  from public.setlists s where s.gig_id = g.id;

-- 3. Remove o vinculo antigo (1 setlist por show).
drop index if exists public.setlists_gig_key;
alter table public.setlists drop column gig_id;

-- 4. Repertorio principal: no maximo um por banda, so entre os de escopo 'band'.
alter table public.setlists add column is_default boolean not null default false;
create unique index setlists_one_default_per_band
  on public.setlists (band_id) where is_default and scope = 'band';

-- 5. Troca atomica do principal.
create or replace function private.set_default_setlist(target_id uuid) returns void
language plpgsql security definer set search_path = public as $$
declare target_band uuid;
begin
  select band_id into target_band from setlists where id = target_id and scope = 'band';
  if target_band is null or not private.is_band_owner(target_band) then
    raise exception 'sem permissao';
  end if;
  update setlists set is_default = false where band_id = target_band and scope = 'band' and is_default;
  update setlists set is_default = true where id = target_id;
end $$;
revoke all on function private.set_default_setlist(uuid) from public;
grant execute on function private.set_default_setlist(uuid) to authenticated;

-- 6. Leitura de repertorios 'band' abre pra qualquer membro (nao so o dono/quem esta escalado
-- no show vinculado, ja que o repertorio deixa de ser um detalhe de um show so). Escrita continua
-- so dono.
create or replace function private.can_read_setlist(sid uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from setlists s
    where s.id = sid
      and case s.scope
        when 'personal' then s.owner_user_id = auth.uid() and private.is_band_member(s.band_id)
        else private.is_band_member(s.band_id)
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
