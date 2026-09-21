alter table public.bands add column if not exists referred_by uuid references public.bands(id) on delete set null;
