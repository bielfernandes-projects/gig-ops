import { redirect } from 'next/navigation';
import { getUserInfo } from '@/lib/auth';
import { createClient } from '@/lib/supabase/server';
import { CatalogClient, type CatalogSong } from '@/components/catalog-client';
import { PersonalSetlists } from '@/components/personal-setlists';
import { BandSetlists } from '@/components/band-setlists';
import { PageHeader } from '@/components/page-header';

export const revalidate = 0;

export default async function RepertorioPage() {
  const info = await getUserInfo();
  if (!info.userId) redirect('/login');
  if (info.memberships.length === 0) redirect('/onboarding');

  // Only bands (in the current view) whose plan includes the module.
  const repBandIds = info.bandIds.filter((id) => info.bands[id]?.modules.repertorio);
  const nameOf = (bandId: string) => info.bands[bandId]?.name ?? 'Banda';

  if (repBandIds.length === 0) {
    return (
      <div className="mx-auto w-full max-w-2xl flex-1 px-4 py-16 text-center">
        <h1 className="text-2xl font-bold text-zinc-50">Repertório</h1>
        <p className="mt-3 text-sm text-zinc-400">O módulo de repertório não está incluído no plano desta banda.</p>
      </div>
    );
  }

  const supabase = await createClient();
  const [songsResult, bandListsResult, personalResult] = await Promise.all([
    supabase
      .from('songs')
      .select('id, title, artist, original_key, bpm, source_url, chart_text, pdf_path, created_by, scope, band_id')
      .in('band_id', repBandIds)
      .order('title', { ascending: true }),
    supabase
      .from('setlists')
      .select('id, name, is_default, band_id')
      .in('band_id', repBandIds)
      .eq('scope', 'band')
      .order('name', { ascending: true }),
    supabase
      .from('setlists')
      .select('id, name, band_id')
      .in('band_id', repBandIds)
      .eq('scope', 'personal')
      .eq('owner_user_id', info.userId)
      .order('created_at', { ascending: false }),
  ]);

  const songs = (songsResult.data ?? []) as (CatalogSong & { band_id: string })[];
  const bandLists = ((bandListsResult.data ?? []) as { id: string; name: string; is_default: boolean; band_id: string }[]).map((l) => ({
    id: l.id,
    name: l.name,
    isDefault: l.is_default,
    bandName: info.allBands ? nameOf(l.band_id) : undefined,
  }));
  const personalLists = ((personalResult.data ?? []) as { id: string; name: string; band_id: string }[]).map((l) => ({
    id: l.id,
    name: l.name,
    bandName: info.allBands ? nameOf(l.band_id) : undefined,
  }));

  return (
    <div className="mx-auto w-full max-w-4xl flex-1 px-4 py-8 pb-32 md:p-10">
      <PageHeader title="Repertório" description="O catálogo de músicas da banda e os repertórios reutilizáveis em qualquer show." className="mb-8" />

      <BandSetlists lists={bandLists} bands={repBandIds.map((id) => ({ bandId: id, name: nameOf(id) }))} />

      <PersonalSetlists lists={personalLists} bands={repBandIds.map((id) => ({ bandId: id, name: nameOf(id) }))} />

      {/* One catalog per band: each band keeps its own songs, and new songs go to that band. */}
      <div className="flex flex-col gap-10">
        {repBandIds.map((bandId) => {
          const bandSongs = songs.filter((s) => s.band_id === bandId);
          return (
            <div key={bandId}>
              <div className="mb-3 flex items-baseline justify-between">
                <h2 className="text-sm font-semibold text-zinc-200">
                  Catálogo {info.allBands ? `· ${nameOf(bandId)}` : 'da banda'}
                </h2>
                <span className="text-xs text-zinc-500">{bandSongs.length} {bandSongs.length === 1 ? 'música' : 'músicas'}</span>
              </div>
              <CatalogClient songs={bandSongs} userId={info.userId!} isOwner={info.bands[bandId]?.role === 'admin'} bandId={bandId} />
            </div>
          );
        })}
      </div>
    </div>
  );
}
