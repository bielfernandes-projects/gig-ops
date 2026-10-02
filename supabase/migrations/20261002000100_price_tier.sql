-- Quanto cada conta paga: 'principal' (plano mais caro da pessoa, preço cheio) ou 'adesao' (as demais, mais barato).
-- Preenchido pelo webhook do Stripe (metadata.tier); contas existentes ficam 'principal'. Aditiva e idempotente.
alter table public.subscriptions add column if not exists price_tier text not null default 'principal';
alter table public.subscriptions drop constraint if exists subscriptions_price_tier_check;
alter table public.subscriptions add constraint subscriptions_price_tier_check check (price_tier in ('principal', 'adesao'));
