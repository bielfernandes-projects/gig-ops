-- Assinatura por banda (Pix manual): o admin da plataforma ativa/expira via SQL ou painel do Supabase.
ALTER TABLE go_settings
  ADD COLUMN IF NOT EXISTS subscription_status TEXT NOT NULL DEFAULT 'trial'
    CHECK (subscription_status IN ('trial', 'active', 'expired')),
  ADD COLUMN IF NOT EXISTS trial_ends_at TIMESTAMPTZ NOT NULL DEFAULT (NOW() + INTERVAL '30 days'),
  ADD COLUMN IF NOT EXISTS paid_until TIMESTAMPTZ;

-- Ativar uma banda após o Pix:
-- UPDATE go_settings SET subscription_status='active', paid_until = NOW() + INTERVAL '30 days' WHERE admin_id = '<uuid>';
