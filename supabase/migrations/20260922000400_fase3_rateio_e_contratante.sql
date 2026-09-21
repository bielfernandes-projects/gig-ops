alter table public.band_members
  add column if not exists profit_share numeric(5,2)
  check (profit_share is null or (profit_share >= 0 and profit_share <= 100));

alter table public.go_gigs add column if not exists client_name text;
