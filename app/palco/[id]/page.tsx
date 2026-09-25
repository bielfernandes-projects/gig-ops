import Link from 'next/link';
import { redirect } from 'next/navigation';
import { getUserInfo } from '@/lib/auth';
import { createClient } from '@/lib/supabase/server';
import { transposeStartKey } from '@/lib/transpose';
import { StageView, type StageItem } from '@/components/stage-view';
import type { SetlistTree } from '@/components/gig-setlist';

export const revalidate = 0;

export default async function StagePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const info = await getUserInfo();
  if (!info.userId) redirect('/login');

  const supabase = await createClient();
  // RLS: qualquer membro da banda le repertorios 'band'; os pessoais so o dono
  const { data } = (await supabase
    .from('setlists')
    .select('id, name, blocks(id, name, position, block_songs(id, position, requested_key, reference_key, note, transition_note, songs(id, title, artist, original_key, start_key, notes, bpm, source_url, chart_text, pdf_path)))')
    .eq('id', id)
    .maybeSingle()) as unknown as { data: SetlistTree | null };

  if (!data) {
    return (
      <div className="fixed inset-0 z-[999] flex flex-col items-center justify-center gap-4 bg-black p-6 text-center text-zinc-300">
        <p>Repertório não encontrado ou sem permissão.</p>
        <Link href="/agenda" className="rounded-md bg-white px-4 py-2 text-sm font-bold text-black">Voltar</Link>
      </div>
    );
  }

  const items: StageItem[] = [...data.blocks]
    .sort((a, b) => a.position - b.position)
    .flatMap((block) =>
      [...block.block_songs]
        .sort((a, b) => a.position - b.position)
        .map((bs) => ({
          id: bs.id,
          songId: bs.songs?.id ?? null,
          block: block.name,
          title: bs.songs?.title ?? 'Música removida',
          artist: bs.songs?.artist ?? null,
          key: bs.requested_key || bs.reference_key || bs.songs?.original_key || null,
          originalKey: bs.songs?.original_key ?? null,
          startKey: transposeStartKey(bs.songs?.start_key, bs.songs?.original_key, bs.requested_key),
          songNotes: bs.songs?.notes ?? null,
          bpm: bs.songs?.bpm ?? null,
          note: bs.note,
          transitionNote: bs.transition_note,
          chart: bs.songs?.chart_text ?? null,
          pdfPath: bs.songs?.pdf_path ?? null,
        }))
    );

  return <StageView name={data.name} items={items} backHref="/repertorio" />;
}
