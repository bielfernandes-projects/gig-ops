-- PDF por música no repertório: bucket privado, permissão espelha as policies de songs_update/songs_delete.
alter table public.songs add column pdf_path text;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('song-pdfs', 'song-pdfs', false, 10485760, array['application/pdf']);

create policy song_pdfs_select on storage.objects for select to authenticated using (
  bucket_id = 'song-pdfs' and exists (
    select 1 from public.songs s
    where s.id = (split_part(name, '.', 1))::uuid
      and private.is_band_member(s.band_id)
      and (s.scope = 'band' or s.owner_user_id = auth.uid())
  )
);

create policy song_pdfs_write on storage.objects for all to authenticated
  using (
    bucket_id = 'song-pdfs' and exists (
      select 1 from public.songs s
      where s.id = (split_part(name, '.', 1))::uuid
        and ((s.scope = 'band' and (private.is_band_owner(s.band_id) or s.created_by = auth.uid()))
          or (s.scope = 'personal' and s.owner_user_id = auth.uid()))
    )
  )
  with check (
    bucket_id = 'song-pdfs' and exists (
      select 1 from public.songs s
      where s.id = (split_part(name, '.', 1))::uuid
        and ((s.scope = 'band' and (private.is_band_owner(s.band_id) or s.created_by = auth.uid()))
          or (s.scope = 'personal' and s.owner_user_id = auth.uid()))
    )
  );
