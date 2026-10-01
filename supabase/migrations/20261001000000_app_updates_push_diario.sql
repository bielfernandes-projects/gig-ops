-- Push diário das "Atualizações do app": em vez de um push por atualização lançada, um cron às 8h
-- (Brasília) manda UM push se houver atualização ainda não avisada. `push_sent_at` marca o que já foi.
--
-- As atualizações que já existem nunca foram para o push diário, então a coluna nasce preenchida
-- nelas: sem isso o primeiro cron reenviaria o histórico inteiro. O bloco só roda quando a coluna
-- ainda não existe, para que reaplicar a migration nunca marque como enviada uma atualização nova.
do $$
begin
  if not exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'app_updates' and column_name = 'push_sent_at'
  ) then
    alter table public.app_updates add column push_sent_at timestamptz;
    update public.app_updates set push_sent_at = now() where push_sent_at is null;
  end if;
end $$;
