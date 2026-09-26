-- Quando a pessoa terminou (ou pulou) o tour guiado. Antes isso só existia no localStorage,
-- então o tour voltava em cada navegador/aparelho novo da mesma conta.
alter table public.go_profiles add column if not exists tour_seen_at timestamptz;
