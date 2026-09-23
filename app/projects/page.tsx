import { createClient } from '@/lib/supabase/server';
import { GoProject } from '@/lib/types';
import { PostgrestError } from '@supabase/supabase-js';
import { AddProjectModal } from '@/components/add-project-modal';
import { ProjectCard } from '@/components/project-card';
import { BandSwitcher } from '@/components/band-switcher';
import { getUserInfo, ownedBands } from '@/lib/auth';

export const revalidate = 0;

export default async function ProjectsPage() {
  const info = await getUserInfo();
  const supabase = await createClient();

  // Multi-tenant isolation: scope reads to the bands in the current view. With no band, use a
  // sentinel UUID so the filter matches nothing.
  const SENTINEL_NO_TENANT = '00000000-0000-0000-0000-000000000000';
  const scope = info.bandIds.length > 0 ? info.bandIds : [SENTINEL_NO_TENANT];
  const owned = ownedBands(info);

  const projectsResult = await supabase
    .from('go_projects')
    .select('*')
    .order('name', { ascending: true })
    .in('band_id', scope) as unknown as { data: GoProject[] | null, error: PostgrestError | null };

  const projects = projectsResult.data || [];
  const error = projectsResult.error;

  // One group per band in view; each follows the person's role in that band.
  const groups = info.bandIds
    .map((bandId) => ({
      bandId,
      name: info.bands[bandId]?.name ?? 'Banda',
      role: info.bands[bandId]?.role ?? 'viewer',
      projects: projects.filter((p) => p.band_id === bandId),
    }))
    .filter((g) => g.projects.length > 0);

  return (
    <div className="flex-1 w-full max-w-4xl mx-auto px-4 py-8 md:p-10 relative">
      <header className="mb-8 flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight text-zinc-50 mb-2">
            Projetos
          </h1>
          <p className="text-zinc-400 text-sm md:text-base">
            Gerencie os formatos de apresentação da sua banda.
          </p>
        </div>
        <BandSwitcher memberships={info.memberships} currentBandId={info.bandId} />
      </header>

      {error && (
        <div className="p-4 text-red-500 bg-red-500/10 border border-red-500/20 rounded-xl mb-6">
          <h2 className="font-bold mb-2">Erro ao carregar projetos</h2>
          <p className="text-sm text-red-400/80">
            Não foi possível carregar os projetos. Verifique sua conexão e tente novamente.
          </p>
        </div>
      )}

      <main className="pb-32 flex flex-col gap-10">
        {projects.length === 0 && !error ? (
          <div className="py-20 flex flex-col items-center justify-center text-center border border-dashed border-zinc-800 rounded-xl bg-zinc-900/20">
            <p className="text-zinc-400 font-medium">Nenhum projeto cadastrado.</p>
            {owned.length > 0 && <p className="text-zinc-500 text-sm mt-1">Toque no + para começar.</p>}
          </div>
        ) : (
          groups.map((g) => (
            <section key={g.bandId}>
              {info.allBands && <h2 className="mb-3 text-sm font-bold text-zinc-300">{g.name}</h2>}
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                {g.projects.map((project) => (
                  <ProjectCard key={project.id} project={project} role={g.role} />
                ))}
              </div>
            </section>
          ))
        )}
      </main>

      {owned.length > 0 && <AddProjectModal bands={owned} />}
    </div>
  );
}
