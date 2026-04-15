import { supabase } from '@/lib/supabase';
import { GoProject } from '@/lib/types';
import { PostgrestError } from '@supabase/supabase-js';
import { AddProjectModal } from '@/components/add-project-modal';
import { ProjectCard } from '@/components/project-card';
import { getUserRole } from '@/lib/auth';

export const revalidate = 0;

export default async function ProjectsPage() {
  const role = await getUserRole();

  const { data: projectsData, error } = await supabase
    .from('go_projects')
    .select('*')
    .order('name', { ascending: true }) as { data: GoProject[] | null, error: PostgrestError | null };

  const projects = projectsData || [];

  return (
    <div className="flex-1 w-full max-w-4xl mx-auto px-4 py-8 md:p-10 relative">
      <header className="mb-8">
        <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight text-zinc-50 mb-2">
          Projetos
        </h1>
        <p className="text-zinc-400 text-sm md:text-base">
          Gerencie os formatos de apresentação da sua banda.
        </p>
      </header>

      {error && (
         <div className="p-4 text-red-500 bg-red-500/10 border border-red-500/20 rounded-xl mb-6">
           <h2 className="font-bold mb-2">Erro ao carregar os dados:</h2>
           <pre className="text-xs overflow-auto p-4 bg-black/50 rounded-lg">
             {JSON.stringify(error, null, 2)}
           </pre>
         </div>
      )}

      <main className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 pb-32">
        {projects.length === 0 && !error ? (
          <div className="col-span-full py-20 flex flex-col items-center justify-center text-center border border-dashed border-zinc-800 rounded-xl bg-zinc-900/20">
            <p className="text-zinc-400 font-medium">Nenhum projeto cadastrado.</p>
            {role === 'admin' && <p className="text-zinc-500 text-sm mt-1">Toque no + para começar.</p>}
          </div>
        ) : (
          projects.map((project) => (
            <ProjectCard key={project.id} project={project} role={role} />
          ))
        )}
      </main>

      {role === 'admin' && <AddProjectModal />}
    </div>
  );
}
