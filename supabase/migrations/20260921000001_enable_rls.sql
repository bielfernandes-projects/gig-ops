-- Isolamento por banda (tenant) via RLS.
-- Modelo: admin = dono do tenant (tenant_id = próprio id); viewer = músico convidado (tenant_id = invited_by).
-- Escritas em go_profiles/go_settings/go_push_subscriptions acontecem só no servidor (service role, que ignora RLS).

CREATE SCHEMA IF NOT EXISTS private;
GRANT USAGE ON SCHEMA private TO authenticated;

-- Helpers SECURITY DEFINER (evitam recursão de RLS). Schema "private" não é exposto pela API.
CREATE OR REPLACE FUNCTION private.tenant_id() RETURNS uuid
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT CASE WHEN role = 'admin' THEN id ELSE invited_by END FROM go_profiles WHERE id = auth.uid()
$$;

CREATE OR REPLACE FUNCTION private.is_admin() RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT COALESCE((SELECT role = 'admin' FROM go_profiles WHERE id = auth.uid()), false)
$$;

-- Shows em que o usuário logado (viewer) está escalado, dentro do tenant dele.
CREATE OR REPLACE FUNCTION private.my_gig_ids() RETURNS SETOF uuid
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT l.gig_id
  FROM go_lineup l
  JOIN go_members m ON m.id = l.member_id
  WHERE m.admin_id = private.tenant_id()
    AND lower(m.email) = lower(auth.jwt() ->> 'email')
$$;

GRANT EXECUTE ON FUNCTION private.tenant_id(), private.is_admin(), private.my_gig_ids() TO authenticated;

-- go_profiles: cada um vê o próprio; admin vê quem convidou. Sem escrita pelo cliente.
ALTER TABLE go_profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY profiles_select ON go_profiles FOR SELECT TO authenticated
  USING (id = auth.uid() OR invited_by = auth.uid());

-- go_settings (invite_code, calendar_token): só o admin dono lê. Escrita só via servidor.
ALTER TABLE go_settings ENABLE ROW LEVEL SECURITY;
CREATE POLICY settings_select ON go_settings FOR SELECT TO authenticated
  USING (admin_id = auth.uid());

-- go_projects e go_members: leitura no tenant; escrita só do admin dono.
ALTER TABLE go_projects ENABLE ROW LEVEL SECURITY;
CREATE POLICY projects_select ON go_projects FOR SELECT TO authenticated
  USING (admin_id = private.tenant_id());
CREATE POLICY projects_write ON go_projects FOR ALL TO authenticated
  USING (admin_id = auth.uid() AND private.is_admin())
  WITH CHECK (admin_id = auth.uid() AND private.is_admin());

ALTER TABLE go_members ENABLE ROW LEVEL SECURITY;
CREATE POLICY members_select ON go_members FOR SELECT TO authenticated
  USING (admin_id = private.tenant_id());
CREATE POLICY members_write ON go_members FOR ALL TO authenticated
  USING (admin_id = auth.uid() AND private.is_admin())
  WITH CHECK (admin_id = auth.uid() AND private.is_admin());

-- go_gigs: admin vê todos do tenant; viewer só onde está escalado.
ALTER TABLE go_gigs ENABLE ROW LEVEL SECURITY;
CREATE POLICY gigs_select ON go_gigs FOR SELECT TO authenticated
  USING (admin_id = auth.uid() OR id IN (SELECT private.my_gig_ids()));
CREATE POLICY gigs_write ON go_gigs FOR ALL TO authenticated
  USING (admin_id = auth.uid() AND private.is_admin())
  WITH CHECK (admin_id = auth.uid() AND private.is_admin());

-- go_lineup: acompanha o show.
ALTER TABLE go_lineup ENABLE ROW LEVEL SECURITY;
CREATE POLICY lineup_select ON go_lineup FOR SELECT TO authenticated
  USING (
    gig_id IN (SELECT id FROM go_gigs WHERE admin_id = auth.uid())
    OR gig_id IN (SELECT private.my_gig_ids())
  );
CREATE POLICY lineup_write ON go_lineup FOR ALL TO authenticated
  USING (private.is_admin() AND gig_id IN (SELECT id FROM go_gigs WHERE admin_id = auth.uid()))
  WITH CHECK (private.is_admin() AND gig_id IN (SELECT id FROM go_gigs WHERE admin_id = auth.uid()));

-- go_push_subscriptions: a policy já existia, faltava ligar o RLS.
ALTER TABLE go_push_subscriptions ENABLE ROW LEVEL SECURITY;

-- Trigger de novo usuário: não precisa ser chamável pela API.
ALTER FUNCTION public.handle_new_user() SET search_path = public;
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;

-- Código de convite: único, e gerado aleatoriamente (o default fixo 'SEIS4-MVP' colidiria entre bandas).
ALTER TABLE go_settings ALTER COLUMN invite_code SET DEFAULT upper(substr(md5(random()::text), 1, 5));
CREATE UNIQUE INDEX IF NOT EXISTS go_settings_invite_code_key ON go_settings (upper(invite_code));
