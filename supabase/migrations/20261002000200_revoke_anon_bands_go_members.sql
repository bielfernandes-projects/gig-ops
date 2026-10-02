-- Defesa em profundidade: o papel anon nao precisa ler bands nem go_members (calendar_token, referred_by).
-- O app so acessa essas tabelas sem login pelo service role (convite, iCal, push, cron).
revoke all on public.bands from anon;
revoke all on public.go_members from anon;
