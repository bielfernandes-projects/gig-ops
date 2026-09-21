'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { ArrowUp, ArrowDown, Trash2, Pencil, FileText, Plus, Link2, PlayCircle, X } from 'lucide-react';
import {
  createGigSetlist,
  deleteSetlist,
  addBlock,
  renameBlock,
  deleteBlock,
  moveBlock,
  addSongToBlock,
  updateBlockSong,
  removeBlockSong,
  moveBlockSong,
  createShareLink,
  revokeShareLink,
} from '@/app/actions/setlist-actions';
import { MUSICAL_KEYS } from '@/lib/keys';
import { SongViewer, type SongView } from '@/components/song-viewer';

export type SetlistSong = {
  id: string;
  title: string;
  artist: string | null;
  original_key: string | null;
  bpm: number | null;
  source_url: string | null;
  chart_text: string | null;
};
export type SetlistItem = {
  id: string;
  position: number;
  requested_key: string | null;
  reference_key: string | null;
  note: string | null;
  transition_note: string | null;
  songs: SetlistSong | null;
};
export type SetlistBlock = { id: string; name: string; position: number; block_songs: SetlistItem[] };
export type SetlistTree = { id: string; name: string; blocks: SetlistBlock[] };
export type CatalogOption = { id: string; title: string; artist: string | null; original_key: string | null };

const inputCls =
  'bg-zinc-900 border border-zinc-800 rounded-md px-3 py-2 text-sm text-zinc-100 focus:outline-none focus:border-zinc-600 placeholder-zinc-600';
const iconBtn = 'p-1.5 rounded text-zinc-500 hover:text-zinc-200 hover:bg-zinc-800 disabled:opacity-30';

type Result = { error?: string; success?: boolean; token?: string } | undefined;

export function GigSetlist({
  gigId,
  setlist,
  catalog,
  isOwner,
  shareToken,
}: {
  gigId: string;
  setlist: SetlistTree | null;
  catalog: CatalogOption[];
  isOwner: boolean;
  shareToken: string | null;
}) {
  const router = useRouter();
  const [viewing, setViewing] = useState<SongView | null>(null);
  const [editingItem, setEditingItem] = useState<string | null>(null);
  const [newBlock, setNewBlock] = useState('');

  const run = async (action: () => Promise<Result>, okMsg?: string) => {
    const res = await action();
    if (res?.error) toast.error(res.error);
    else {
      if (okMsg) toast.success(okMsg);
      router.refresh();
    }
    return res;
  };

  if (!setlist) {
    return (
      <section className="mb-10 rounded-xl border border-dashed border-zinc-800 p-6 text-center">
        <h2 className="mb-1 text-sm font-semibold text-zinc-200">Repertório do show</h2>
        {isOwner ? (
          <>
            <p className="mb-4 text-xs text-zinc-500">Monte a ordem das músicas, os tons e compartilhe com a banda.</p>
            <button
              type="button"
              onClick={() => run(() => createGigSetlist(gigId), 'Repertório criado.')}
              className="rounded-md bg-zinc-100 px-4 py-2 text-sm font-bold text-zinc-900 hover:bg-white"
            >
              Criar repertório do show
            </button>
          </>
        ) : (
          <p className="text-xs text-zinc-500">O repertório deste show ainda não foi montado.</p>
        )}
      </section>
    );
  }

  const blocks = [...setlist.blocks].sort((a, b) => a.position - b.position);
  const total = blocks.reduce((n, b) => n + b.block_songs.length, 0);
  const shareUrl = shareToken && typeof window !== 'undefined' ? `${window.location.origin}/s/${shareToken}` : null;

  return (
    <section className="mb-10">
      <div className="mb-4 flex flex-wrap items-end justify-between gap-3 px-1">
        <div>
          <h2 className="text-sm font-semibold text-zinc-200">Repertório do show</h2>
          <p className="text-xs text-zinc-500">
            {blocks.length} {blocks.length === 1 ? 'bloco' : 'blocos'} · {total} {total === 1 ? 'música' : 'músicas'}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {total > 0 && (
            <Link href={`/palco/${setlist.id}`} className="inline-flex items-center gap-1.5 rounded-md bg-zinc-100 px-3 py-1.5 text-xs font-bold text-zinc-900 hover:bg-white">
              <PlayCircle className="h-4 w-4" /> Modo palco
            </Link>
          )}
          {isOwner &&
            (shareToken ? (
              <>
                <button
                  type="button"
                  onClick={async () => {
                    if (shareUrl) {
                      await navigator.clipboard.writeText(shareUrl);
                      toast.success('Link copiado. Quem tiver o link só visualiza a ordem e os tons.');
                    }
                  }}
                  className="inline-flex items-center gap-1.5 rounded-md border border-zinc-700 px-3 py-1.5 text-xs font-semibold text-zinc-200 hover:bg-zinc-800"
                >
                  <Link2 className="h-4 w-4" /> Copiar link
                </button>
                <button
                  type="button"
                  onClick={() => run(() => revokeShareLink(setlist.id), 'Link revogado.')}
                  className="rounded-md px-2 py-1.5 text-xs text-zinc-500 underline underline-offset-4 hover:text-zinc-300"
                >
                  Revogar link
                </button>
              </>
            ) : (
              <button
                type="button"
                onClick={() => run(() => createShareLink(setlist.id), 'Link criado. Clique em "Copiar link".')}
                className="inline-flex items-center gap-1.5 rounded-md border border-zinc-700 px-3 py-1.5 text-xs font-semibold text-zinc-200 hover:bg-zinc-800"
              >
                <Link2 className="h-4 w-4" /> Gerar link para compartilhar
              </button>
            ))}
        </div>
      </div>

      <div className="flex flex-col gap-4">
        {blocks.map((block, bi) => {
          const items = [...block.block_songs].sort((a, b) => a.position - b.position);
          return (
            <div key={block.id} className="rounded-xl border border-zinc-800 bg-zinc-900">
              <div className="flex items-center justify-between gap-2 border-b border-zinc-800 px-4 py-2.5">
                <h3 className="truncate text-sm font-bold text-zinc-100">{block.name}</h3>
                {isOwner && (
                  <div className="flex shrink-0 items-center">
                    <button type="button" title="Renomear bloco" className={iconBtn} onClick={() => {
                      const name = prompt('Nome do bloco', block.name);
                      if (name) run(() => renameBlock(block.id, name));
                    }}><Pencil className="h-4 w-4" /></button>
                    <button type="button" title="Subir bloco" disabled={bi === 0} className={iconBtn} onClick={() => run(() => moveBlock(block.id, 'up'))}><ArrowUp className="h-4 w-4" /></button>
                    <button type="button" title="Descer bloco" disabled={bi === blocks.length - 1} className={iconBtn} onClick={() => run(() => moveBlock(block.id, 'down'))}><ArrowDown className="h-4 w-4" /></button>
                    <button type="button" title="Remover bloco" className={`${iconBtn} hover:!text-red-400`} onClick={() => {
                      if (confirm(`Remover o bloco "${block.name}" e suas músicas?`)) run(() => deleteBlock(block.id));
                    }}><Trash2 className="h-4 w-4" /></button>
                  </div>
                )}
              </div>

              <ol className="divide-y divide-zinc-800">
                {items.map((item, ii) => {
                  const song = item.songs;
                  const changed = item.requested_key && item.reference_key && item.requested_key !== item.reference_key;
                  return (
                    <li key={item.id} className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <span className="w-5 shrink-0 text-xs tabular-nums text-zinc-500">{ii + 1}</span>
                        <button
                          type="button"
                          className="min-w-0 flex-1 text-left"
                          onClick={() => song && setViewing({ ...song, requested_key: item.requested_key, note: item.note })}
                        >
                          <p className="truncate text-sm font-semibold text-zinc-100">{song?.title ?? 'Música removida'}</p>
                          <p className="truncate text-xs text-zinc-500">
                            {song?.artist}
                            {item.note ? ` · ${item.note}` : ''}
                          </p>
                        </button>
                        {(item.requested_key || item.reference_key) && (
                          <span className="shrink-0 rounded bg-zinc-800 px-2 py-0.5 text-xs font-bold text-zinc-100" title={changed ? `Original ${item.reference_key}` : undefined}>
                            {item.requested_key || item.reference_key}
                            {changed ? <span className="ml-1 font-normal text-zinc-500">({item.reference_key})</span> : null}
                          </span>
                        )}
                        {song?.chart_text && (
                          <button type="button" title="Ver cifra" className={iconBtn} onClick={() => setViewing({ ...song, requested_key: item.requested_key, note: item.note })}>
                            <FileText className="h-4 w-4" />
                          </button>
                        )}
                        {isOwner && (
                          <div className="flex shrink-0 items-center">
                            <button type="button" title="Editar tom e observações" className={iconBtn} onClick={() => setEditingItem(editingItem === item.id ? null : item.id)}><Pencil className="h-4 w-4" /></button>
                            <button type="button" title="Subir" disabled={ii === 0} className={iconBtn} onClick={() => run(() => moveBlockSong(item.id, 'up'))}><ArrowUp className="h-4 w-4" /></button>
                            <button type="button" title="Descer" disabled={ii === items.length - 1} className={iconBtn} onClick={() => run(() => moveBlockSong(item.id, 'down'))}><ArrowDown className="h-4 w-4" /></button>
                            <button type="button" title="Remover" className={`${iconBtn} hover:!text-red-400`} onClick={() => run(() => removeBlockSong(item.id))}><X className="h-4 w-4" /></button>
                          </div>
                        )}
                      </div>

                      {item.transition_note && <p className="ml-8 mt-1 text-xs text-amber-300">Passagem: {item.transition_note}</p>}

                      {isOwner && editingItem === item.id && (
                        <form
                          className="ml-8 mt-3 grid gap-2 md:grid-cols-[8rem_1fr_1fr_auto]"
                          onSubmit={async (e) => {
                            e.preventDefault();
                            const fd = new FormData(e.currentTarget);
                            const res = await run(() =>
                              updateBlockSong(item.id, {
                                requested_key: String(fd.get('requested_key') ?? ''),
                                note: String(fd.get('note') ?? ''),
                                transition_note: String(fd.get('transition_note') ?? ''),
                              })
                            , 'Salvo.');
                            if (!res?.error) setEditingItem(null);
                          }}
                        >
                          <select name="requested_key" defaultValue={item.requested_key ?? ''} className={`${inputCls} appearance-none`} aria-label="Tom pedido">
                            <option value="">Tom pedido</option>
                            {MUSICAL_KEYS.map((k) => <option key={k} value={k}>{k}</option>)}
                          </select>
                          <input name="note" defaultValue={item.note ?? ''} placeholder="Observação (ex: começa do solo)" className={inputCls} />
                          <input name="transition_note" defaultValue={item.transition_note ?? ''} placeholder="Passagem para a próxima" className={inputCls} />
                          <button type="submit" className="rounded-md bg-zinc-100 px-4 py-2 text-sm font-bold text-zinc-900 hover:bg-white">Salvar</button>
                        </form>
                      )}
                    </li>
                  );
                })}
                {items.length === 0 && <li className="px-4 py-4 text-xs text-zinc-500">Bloco vazio.</li>}
              </ol>

              {isOwner && (
                <form
                  className="flex flex-wrap gap-2 border-t border-zinc-800 px-4 py-3"
                  onSubmit={async (e) => {
                    e.preventDefault();
                    const form = e.currentTarget;
                    const fd = new FormData(form);
                    const songId = String(fd.get('song_id') ?? '');
                    if (!songId) return;
                    const res = await run(() => addSongToBlock(block.id, songId, String(fd.get('requested_key') ?? '')));
                    if (!res?.error) form.reset();
                  }}
                >
                  <select name="song_id" required defaultValue="" className={`${inputCls} min-w-0 flex-1 appearance-none`} aria-label="Música do catálogo">
                    <option value="" disabled>Adicionar música do catálogo</option>
                    {catalog.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.title}{s.artist ? ` (${s.artist})` : ''}{s.original_key ? ` · ${s.original_key}` : ''}
                      </option>
                    ))}
                  </select>
                  <select name="requested_key" defaultValue="" className={`${inputCls} w-28 appearance-none`} aria-label="Tom pedido">
                    <option value="">Tom original</option>
                    {MUSICAL_KEYS.map((k) => <option key={k} value={k}>{k}</option>)}
                  </select>
                  <button type="submit" className="inline-flex items-center gap-1 rounded-md bg-zinc-100 px-3 py-2 text-sm font-bold text-zinc-900 hover:bg-white"><Plus className="h-4 w-4" /> Adicionar</button>
                </form>
              )}
            </div>
          );
        })}

        {isOwner && (
          <>
            <form
              className="flex gap-2"
              onSubmit={async (e) => {
                e.preventDefault();
                const res = await run(() => addBlock(setlist.id, newBlock));
                if (!res?.error) setNewBlock('');
              }}
            >
              <input value={newBlock} onChange={(e) => setNewBlock(e.target.value)} placeholder="Novo bloco (ex: Pagode, Louvor)" className={`${inputCls} min-w-0 flex-1`} aria-label="Nome do novo bloco" />
              <button type="submit" disabled={!newBlock.trim()} className="rounded-md border border-zinc-700 px-4 py-2 text-sm font-semibold text-zinc-200 hover:bg-zinc-800 disabled:opacity-40">Novo bloco</button>
            </form>
            <button
              type="button"
              onClick={() => {
                if (confirm('Remover todo o repertório deste show?')) run(() => deleteSetlist(setlist.id), 'Repertório removido.');
              }}
              className="w-fit text-xs text-zinc-600 underline underline-offset-4 hover:text-red-400"
            >
              Remover repertório do show
            </button>
          </>
        )}
      </div>

      {viewing && <SongViewer song={viewing} onClose={() => setViewing(null)} />}
    </section>
  );
}
