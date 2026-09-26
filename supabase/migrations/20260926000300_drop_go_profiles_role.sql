-- Fim da limpeza da fase 0: saem go_profiles.role e go_profiles.invited_by, as duas últimas peças
-- do modelo antigo (admin = dono do tenant, viewer = convidado). O papel de verdade é
-- band_members.role ('owner' | 'member'), e nenhum código do app lê essas duas colunas.
--
-- Roda quantas vezes precisar: `if exists` em tudo, e a política é recriada do zero.

-- 1. CORREÇÃO DE REGRESSÃO da migration anterior (20260926000200). Aquela migration dropou a
--    política `profiles_select`, que era `id = auth.uid() OR invited_by = auth.uid()` — ou seja,
--    era ela que deixava cada pessoa ler o próprio perfil. A substituta da fase 0,
--    `profiles_band_select`, usa `private.visible_profile_ids()`, que devolve só os membros das
--    bandas onde QUEM LÊ é dono. Resultado: um músico que não é dono de banda nenhuma deixou de
--    conseguir ler a própria linha de go_profiles pelo cliente de sessão — o que quebra
--    `display_name` no Perfil (`app/profile/page.tsx`) e `tour_seen_at` no Dashboard
--    (`app/dashboard/page.tsx`), os dois lidos com o cliente de sessão.
--    Políticas permissivas se somam com OR, então esta conviver com `profiles_band_select` dá
--    exatamente o que o app precisa: cada um lê o seu, e o dono lê os da banda dele.
drop policy if exists profiles_own_select on public.go_profiles;
create policy profiles_own_select on public.go_profiles for select to authenticated
  using (id = auth.uid());

-- 2. Qualquer outra política de go_profiles que ainda cite as colunas que vão sair — inclusive as
--    criadas pelo painel, fora das migrations (foi o caso de `reminders_admin`). As duas que o app
--    precisa ficam de fora da varredura pelo nome.
do $$
declare p record;
begin
  for p in
    select policyname
    from pg_policies
    where schemaname = 'public'
      and tablename = 'go_profiles'
      and policyname not in ('profiles_own_select', 'profiles_band_select')
      and (coalesce(qual, '') || ' ' || coalesce(with_check, '')) ~ '\minvited_by\M|\mrole\M'
  loop
    execute format('drop policy %I on public.go_profiles', p.policyname);
    raise notice 'política legada removida: % em go_profiles', p.policyname;
  end loop;
end $$;

-- 3. A trigger de novo usuário gravava 'viewer' em go_profiles.role. Sem este passo, dropar a
--    coluna faria TODO cadastro novo falhar com "Database error saving new user". Agora a função
--    fica versionada aqui (antes só existia no painel, o que é como este problema passou perto).
--    O `on conflict do nothing` é defensivo: se a linha de perfil já existir por qualquer motivo,
--    o cadastro não morre por causa disso.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path to 'public'
as $function$
begin
  insert into public.go_profiles (id, email)
  values (new.id, new.email)
  on conflict (id) do nothing;
  return new;
end;
$function$;

-- 4. As colunas. Índice (idx_go_profiles_invited_by), FK e constraints delas caem junto.
alter table public.go_profiles drop column if exists role;
alter table public.go_profiles drop column if exists invited_by;
