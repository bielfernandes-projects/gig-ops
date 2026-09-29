-- Aviso "Premium desbloqueado": marca quando o Dono já foi avisado de que a banda está com a
-- assinatura ativa. Vazio = ainda não avisado. O app grava ao mostrar o aviso e limpa se a banda
-- deixar de ser Premium (assim uma reativação avisa de novo).
alter table public.subscriptions add column if not exists premium_seen_at timestamptz;

-- Bandas que já são Premium hoje não recebem o aviso retroativamente.
update public.subscriptions set premium_seen_at = now() where status = 'active' and premium_seen_at is null;
