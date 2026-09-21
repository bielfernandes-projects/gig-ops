alter table public.go_profiles add column if not exists display_name text check (display_name is null or char_length(display_name) between 1 and 40);
