-- Índices para otimizar queries do Minha Banda
-- Data: 2026-04-28
-- Objetivo: Acelerar filtros por data, busca de lineup e verificação de perfil

-- Índice para filtros por start_time (usado na Home para filtrar gigs por período)
CREATE INDEX IF NOT EXISTS idx_go_gigs_start_time ON public.go_gigs (start_time DESC);

-- Índice composto para busca de lineup por gig_id (usado extensivamente na Home)
CREATE INDEX IF NOT EXISTS idx_go_lineup_gig_id ON public.go_lineup (gig_id);

-- Índice para busca de lineup por member_id (usado para viewers verem apenas seus gigs)
CREATE INDEX IF NOT EXISTS idx_go_lineup_member_id ON public.go_lineup (member_id);

-- Índice composto para verificação de perfil por ID (usado no getUserInfo)
CREATE INDEX IF NOT EXISTS idx_go_profiles_id ON public.go_profiles (id);

-- Índice para busca de membro por email (usado no getUserInfo)
CREATE INDEX IF NOT EXISTS idx_go_members_email ON public.go_members (email);

-- Índice para projetos (usado no select de projetos na Home)
CREATE INDEX IF NOT EXISTS idx_go_projects_name ON public.go_projects (name);

-- Comentários explicativos
COMMENT ON INDEX idx_go_gigs_start_time IS 'Otimiza filtros por período na Home (7dias, mês, custom)';
COMMENT ON INDEX idx_go_lineup_gig_id IS 'Acelera busca de músicos escalados por show';
COMMENT ON INDEX idx_go_lineup_member_id IS 'Acelera filtro de viewer (apenas seus shows)';
COMMENT ON INDEX idx_go_profiles_id IS 'Acelera verificação de role do usuário';
COMMENT ON INDEX idx_go_members_email IS 'Acelera vinculação de usuário ao membro';
