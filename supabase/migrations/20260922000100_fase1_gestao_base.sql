-- Fase 1 do plano unificado: base das melhorias de gestao.
-- Aplicada no Supabase via MCP em 2026-09-22.

-- Tipo de evento e controle opcional de recebimento parcial (sinal e restante)
alter table public.go_gigs add column event_type text;
alter table public.go_gigs add column track_receipts boolean not null default false;

-- Despesas do show (alem do som e do cache dos musicos)
create table public.gig_expenses (
  id uuid primary key default gen_random_uuid(),
  band_id uuid not null references public.bands(id) on delete cascade,
  gig_id uuid not null references public.go_gigs(id) on delete cascade,
  category text not null,
  description text,
  amount numeric(12,2) not null check (amount >= 0),
  created_at timestamptz not null default now()
);
create index idx_gig_expenses_gig on public.gig_expenses (gig_id);
create index idx_gig_expenses_band on public.gig_expenses (band_id);

-- Recebimentos do contratante (sinal, restante)
create table public.gig_payments (
  id uuid primary key default gen_random_uuid(),
  band_id uuid not null references public.bands(id) on delete cascade,
  gig_id uuid not null references public.go_gigs(id) on delete cascade,
  amount numeric(12,2) not null check (amount > 0),
  paid_at date not null default current_date,
  note text,
  created_at timestamptz not null default now()
);
create index idx_gig_payments_gig on public.gig_payments (gig_id);
create index idx_gig_payments_band on public.gig_payments (band_id);

alter table public.gig_expenses enable row level security;
alter table public.gig_payments enable row level security;
create policy gig_expenses_owner on public.gig_expenses for all to authenticated
  using (private.is_band_owner(band_id)) with check (private.is_band_owner(band_id));
create policy gig_payments_owner on public.gig_payments for all to authenticated
  using (private.is_band_owner(band_id)) with check (private.is_band_owner(band_id));

-- Confirmacao de presenca do musico escalado (escrita so pela acao do servidor)
alter table public.go_lineup add column confirmation text not null default 'pending'
  check (confirmation in ('pending', 'confirmed', 'declined'));
