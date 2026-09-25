-- Cobrança pelo Stripe: ids do cliente e da assinatura, preenchidos pelo webhook (/api/stripe/webhook).
alter table public.subscriptions
  add column if not exists stripe_customer_id text unique,
  add column if not exists stripe_subscription_id text unique;
