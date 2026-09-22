'use client';

import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { Plus, Search, Pencil, Trash2, FileText, Paperclip } from 'lucide-react';
import { addSong, updateSong, deleteSong, getSongPdfUrl } from '@/app/actions/song-actions';
import { MUSICAL_KEYS } from '@/lib/keys';
import { SongViewer } from '@/components/song-viewer';

export type CatalogSong = {
  id: string;
  title: string;
  artist: string | null;
  original_key: string | null;
  bpm: number | null;
  source_url: string | null;
  chart_text: string | null;
  pdf_path: string | null;
  created_by: string | null;
  scope?: 'band' | 'personal';
};

async function openSongPdf(songId: string) {
  const res = await getSongPdfUrl(songId);
  if (res.error) return toast.error(res.error);
  window.open(res.url, '_blank', 'noopener,noreferrer');
}

const inputCls =
  'w-full bg-zinc-900 border border-zinc-800 rounded-md px-3 py-2 text-sm text-zinc-100 focus:outline-none focus:border-zinc-600 placeholder-zinc-600';

function cifraClubSearch(title: string, artist: string) {
  return `https://www.cifraclub.com.br/?q=${encodeURIComponent(`${title} ${artist}`.trim())}`;
}

function SongForm({ song, onDone }: { song: CatalogSong | null; onDone: () => void }) {
  const router = useRouter();
  const [title, setTitle] = useState(song?.title ?? '');
  const [artist, setArtist] = useState(song?.artist ?? '');
  const [pending, setPending] = useState(false);
  const [removePdf, setRemovePdf] = useState(false);

  return (
    <form
      onSubmit={async (e) => {
        e.preventDefault();
        setPending(true);
        const fd = new FormData(e.currentTarget);
        if (removePdf) fd.set('remove_pdf', 'true');
        const res = song ? await updateSong(song.id, fd) : await addSong(fd);
        setPending(false);
        if (res?.error) return toast.error(res.error);
        toast.success(song ? 'Música atualizada.' : 'Música adicionada ao catálogo.');
        router.refresh();
        onDone();
      }}
      className="flex flex-col gap-3 rounded-xl border border-zinc-800 bg-zinc-950 p-4"
    >
      <div className="grid gap-3 md:grid-cols-2">
        <label className="flex flex-col gap-1 text-xs font-medium text-zinc-400">
          Música
          <input name="title" required value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Ex: Trem-Bala" className={inputCls} />
        </label>
        <label className="flex flex-col gap-1 text-xs font-medium text-zinc-400">
          Artista
          <input name="artist" value={artist} onChange={(e) => setArtist(e.target.value)} placeholder="Ex: Ana Vilela" className={inputCls} />
        </label>
        <label className="flex flex-col gap-1 text-xs font-medium text-zinc-400">
          Tom original
          <select name="original_key" defaultValue={song?.original_key ?? ''} className={`${inputCls} appearance-none`}>
            <option value="">Não informado</option>
            {MUSICAL_KEYS.map((k) => (
              <option key={k} value={k}>{k}</option>
            ))}
          </select>
        </label>
        <label className="flex flex-col gap-1 text-xs font-medium text-zinc-400">
          BPM
          <input name="bpm" type="number" min={1} max={400} defaultValue={song?.bpm ?? ''} placeholder="Opcional" className={inputCls} />
        </label>
      </div>

      <label className="flex flex-col gap-1 text-xs font-medium text-zinc-400">
        <span className="flex items-center justify-between gap-3">
          Link da cifra (opcional)
          <a
            href={cifraClubSearch(title, artist)}
            target="_blank"
            rel="noopener noreferrer"
            className="font-normal text-zinc-500 underline underline-offset-4 hover:text-zinc-300"
          >
            Procurar no Cifra Club
          </a>
        </span>
        <input name="source_url" type="url" defaultValue={song?.source_url ?? ''} placeholder="https://..." className={inputCls} />
      </label>

      <label className="flex flex-col gap-1 text-xs font-medium text-zinc-400">
        Cifra ou letra (cole o texto)
        <textarea
          name="chart_text"
          rows={10}
          defaultValue={song?.chart_text ?? ''}
          placeholder={'Cole aqui a cifra ou a letra. Ela aparece em fonte grande no modo palco.\n\n[Intro] C G Am F'}
          className={`${inputCls} font-mono`}
        />
      </label>
      <label className="flex flex-col gap-1 text-xs font-medium text-zinc-400">
        PDF da cifra (opcional, até 10MB)
        {song?.pdf_path && !removePdf ? (
          <span className="flex items-center justify-between gap-3 rounded-md border border-zinc-800 bg-zinc-900 px-3 py-2 text-sm text-zinc-300">
            <span className="flex items-center gap-2"><Paperclip className="h-4 w-4" /> PDF anexado</span>
            <button type="button" onClick={() => setRemovePdf(true)} className="text-xs font-semibold text-red-400 hover:text-red-300">
              Remover
            </button>
          </span>
        ) : (
          <input name="pdf" type="file" accept="application/pdf" className={`${inputCls} file:mr-3 file:rounded file:border-0 file:bg-zinc-800 file:px-2 file:py-1 file:text-zinc-200`} />
        )}
      </label>

      {!song && (
        <label className="flex items-center gap-2 text-xs font-medium text-zinc-300">
          <input type="checkbox" name="scope" value="personal" className="h-4 w-4 accent-zinc-100" />
          Só eu vejo (música pessoal, para os meus repertórios)
        </label>
      )}
      <p className="text-xs text-zinc-500">O texto colado é de sua responsabilidade. Músicas da banda ficam visíveis só para a sua banda.</p>

      <div className="flex justify-end gap-2">
        <button type="button" onClick={onDone} className="rounded-md px-4 py-2 text-sm text-zinc-400 hover:text-zinc-200">
          Cancelar
        </button>
        <button type="submit" disabled={pending} className="rounded-md bg-zinc-100 px-4 py-2 text-sm font-bold text-zinc-900 hover:bg-white disabled:opacity-50">
          {pending ? 'Salvando...' : song ? 'Salvar' : 'Adicionar'}
        </button>
      </div>
    </form>
  );
}

export function CatalogClient({ songs, userId, isOwner }: { songs: CatalogSong[]; userId: string; isOwner: boolean }) {
  const router = useRouter();
  const [query, setQuery] = useState('');
  const [editing, setEditing] = useState<CatalogSong | 'new' | null>(null);
  const [viewing, setViewing] = useState<CatalogSong | null>(null);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return q ? songs.filter((s) => `${s.title} ${s.artist ?? ''}`.toLowerCase().includes(q)) : songs;
  }, [songs, query]);

  return (
    <section>
      <div className="mb-4 flex flex-wrap items-center gap-3">
        <div className="relative min-w-52 flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-500" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Buscar música ou artista"
            className={`${inputCls} pl-9`}
            aria-label="Buscar no catálogo"
          />
        </div>
        <button
          type="button"
          onClick={() => setEditing('new')}
          className="inline-flex items-center gap-2 rounded-md bg-zinc-100 px-4 py-2 text-sm font-bold text-zinc-900 hover:bg-white"
        >
          <Plus className="h-4 w-4" /> Nova música
        </button>
      </div>

      {editing && (
        <div className="mb-4">
          <SongForm key={editing === 'new' ? 'new' : editing.id} song={editing === 'new' ? null : editing} onDone={() => setEditing(null)} />
        </div>
      )}

      <ul className="divide-y divide-zinc-800 rounded-xl border border-zinc-800 bg-zinc-900">
        {filtered.map((s) => {
          const canEdit = s.scope === 'personal' ? s.created_by === userId : isOwner || s.created_by === userId;
          return (
            <li key={s.id} className="flex items-center justify-between gap-3 px-4 py-3">
              <button type="button" onClick={() => setViewing(s)} className="min-w-0 flex-1 text-left" title="Abrir cifra">
                <p className="truncate text-sm font-semibold text-zinc-100">{s.title}</p>
                <p className="truncate text-xs text-zinc-500">
                  {[s.scope === 'personal' && 'Pessoal', s.artist, s.original_key && `Tom ${s.original_key}`, s.bpm && `${s.bpm} BPM`].filter(Boolean).join(' · ') || 'Sem detalhes'}
                  {s.chart_text ? '' : ' · sem cifra'}
                </p>
              </button>
              <div className="flex shrink-0 items-center">
                <button type="button" onClick={() => setViewing(s)} title="Ver cifra" className="p-2 text-zinc-500 hover:text-zinc-200">
                  <FileText className="h-4 w-4" />
                </button>
                {s.pdf_path && (
                  <button type="button" onClick={() => openSongPdf(s.id)} title="Abrir PDF" className="p-2 text-zinc-500 hover:text-zinc-200">
                    <Paperclip className="h-4 w-4" />
                  </button>
                )}
                {canEdit && (
                  <>
                    <button type="button" onClick={() => setEditing(s)} title="Editar" className="p-2 text-zinc-500 hover:text-zinc-200">
                      <Pencil className="h-4 w-4" />
                    </button>
                    <button
                      type="button"
                      title="Remover"
                      onClick={async () => {
                        if (!confirm(`Remover "${s.title}" do catálogo? Ela sai também dos repertórios em que estiver.`)) return;
                        const res = await deleteSong(s.id);
                        if (res?.error) toast.error(res.error);
                        else {
                          toast.success('Música removida.');
                          router.refresh();
                        }
                      }}
                      className="p-2 text-zinc-500 hover:text-red-400"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </>
                )}
              </div>
            </li>
          );
        })}
        {filtered.length === 0 && (
          <li className="px-4 py-10 text-center text-sm text-zinc-500">
            {songs.length === 0 ? 'O catálogo da banda ainda está vazio. Adicione a primeira música.' : 'Nenhuma música encontrada.'}
          </li>
        )}
      </ul>

      {viewing && <SongViewer song={viewing} onClose={() => setViewing(null)} />}
    </section>
  );
}
