-- Trial padrão passa de 30 para 7 dias: o público-alvo (bandas médias/grandes, vários shows
-- por semana) já vive um ciclo completo de show dentro de uma semana, então 7 dias bastam pra
-- decidir — e acelera o caminho até faturamento real do SaaS.
alter table public.subscriptions
  alter column trial_ends_at set default (now() + interval '7 days');
