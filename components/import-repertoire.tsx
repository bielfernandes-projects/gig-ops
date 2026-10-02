'use client';

import { useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { FileUp, Loader2, Trash2, TriangleAlert, X } from 'lucide-react';
import { ReadProgress } from '@/components/read-progress';
import { saveImportedRepertoire } from '@/app/actions/import-actions';
import { MUSICAL_KEYS } from '@/lib/keys';
import { missingFields, titleKey, type ImportResult } from '@/lib/import-model';

type CatalogRef = { id: string; title: string };

type Row = {
  id: string;
  title: string;
  artist: string;
  key: string;
  lyricHint: string;
  note: string;
  /** Catalog song with the same title, when there is one. */
  existing: CatalogRef | null;
  /** True = point to the catalog song instead of creating a new one. */
  useExisting: boolean;
};
type Blk = { id: string; name: string; rows: Row[] };

const inputCls =
  'w-full bg-zinc-900 border border-zinc-800 rounded-md px-2.5 py-1.5 text-sm text-zinc-100 focus:outline-none focus:border-zinc-600 placeholder-zinc-600';

const uid = () => crypto.randomUUID();

function toBlocks(result: ImportResult, catalog: CatalogRef[]): Blk[] {
  const byTitle = new Map(catalog.map((s) => [titleKey(s.title), s]));
  return result.blocks.map((b) => ({
    id: uid(),
    name: b.name ?? '',
    rows: b.songs.map((s) => {
      const existing = byTitle.get(titleKey(s.title)) ?? null;
      return { id: uid(), title: s.title, artist: s.artist ?? '', key: s.key ?? '', lyricHint: s.lyricHint ?? '', note: s.note ?? '', existing, useExisting: Boolean(existing) };
    }),
  }));
}

/** Rows that still miss a required field. A song reusing the catalog's own row has nothing pending. */
const pendingOf = (r: Row) => (r.useExisting ? [] : missingFields({ title: r.title, artist: r.artist || null, key: r.key || null, lyricHint: null, note: null }));

export function ImportRepertoire({ bandId, songs }: { bandId: string; songs: CatalogRef[] }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState<'pick' | 'reading' | 'review' | 'saving'>('pick');
  const [error, setError] = useState<string | null>(null);
  const [fileName, setFileName] = useState('');
  const [setlistName, setSetlistName] = useState('');
  const [blocks, setBlocks] = useState<Blk[]>([]);
  const [onlyPending, setOnlyPending] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const reset = () => {
    setStep('pick');
    setError(null);
    setFileName('');
    setSetlistName('');
    setBlocks([]);
    setOnlyPending(false);
  };
  const close = () => {
    if (step === 'reading' || step === 'saving') return;
    setOpen(false);
    reset();
  };

  const all = useMemo(() => blocks.flatMap((b) => b.rows), [blocks]);
  const pending = all.filter((r) => pendingOf(r).length > 0).length;
  const reused = all.filter((r) => r.useExisting).length;
  const seen = useMemo(() => {
    // "repeated in the file": same title as an earlier row (it becomes one catalog song anyway)
    const first = new Set<string>();
    const dup = new Set<string>();
    for (const r of all) {
      const k = titleKey(r.title);
      if (first.has(k)) dup.add(r.id);
      else first.add(k);
    }
    return dup;
  }, [all]);

  async function read() {
    const file = fileRef.current?.files?.[0];
    if (!file) return setError('Escolha um arquivo.');
    setError(null);
    setStep('reading');
    const fd = new FormData();
    fd.set('file', file);
    fd.set('band_id', bandId);
    try {
      const res = await fetch('/api/repertorio/importar', { method: 'POST', body: fd });
      const data = (await res.json().catch(() => ({}))) as ImportResult & { error?: string };
      if (!res.ok) {
        setError(data.error ?? 'Não foi possível ler o documento.');
        return setStep('pick');
      }
      setBlocks(toBlocks(data, songs));
      if (!setlistName) setSetlistName(file.name.replace(/\.[^.]+$/, '').slice(0, 80));
      setStep('review');
    } catch {
      setError('Falha de conexão. Verifique a internet e tente de novo.');
      setStep('pick');
    }
  }

  const patchRow = (blockId: string, rowId: string, patch: Partial<Row>) =>
    setBlocks((bs) => bs.map((b) => (b.id === blockId ? { ...b, rows: b.rows.map((r) => (r.id === rowId ? { ...r, ...patch } : r)) } : b)));

  async function save() {
    setStep('saving');
    const res = await saveImportedRepertoire({
      bandId,
      setlistName,
      blocks: blocks
        .filter((b) => b.rows.length > 0)
        .map((b) => ({
          name: b.name.trim() || null,
          songs: b.rows.map((r) => ({
            title: r.title,
            artist: r.artist.trim() || null,
            key: r.key || null,
            lyricHint: r.lyricHint.trim() || null,
            note: r.note.trim() || null,
            existingId: r.useExisting ? (r.existing?.id ?? null) : null,
          })),
        })),
    });
    if (!res || 'error' in res) {
      toast.error(res?.error ?? 'Não foi possível importar.');
      return setStep('review');
    }
    toast.success(`Repertório importado: ${res.created} ${res.created === 1 ? 'música nova' : 'músicas novas'} no catálogo${res.reused > 0 ? `, ${res.reused} já existiam` : ''}.`);
    setOpen(false);
    reset();
    router.push(`/repertorio/lista/${res.setlistId}`);
  }

  const invalid = all.some((r) => !r.title.trim()) || !setlistName.trim() || all.length === 0;

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="inline-flex items-center gap-2 rounded-md border border-zinc-700 px-4 py-2 text-sm font-semibold text-zinc-200 hover:bg-zinc-900"
      >
        <FileUp className="h-4 w-4" /> Importar repertório
      </button>

      {open && (
        <div className="fixed inset-0 z-[100] overflow-y-auto bg-black/70 px-3 py-6" role="dialog" aria-modal="true" aria-label="Importar repertório">
          <div className="mx-auto w-full max-w-3xl rounded-xl border border-zinc-800 bg-zinc-950 p-4 md:p-5">
            <div className="mb-4 flex items-start justify-between gap-3">
              <div>
                <h2 className="text-lg font-bold text-zinc-50">Importar repertório</h2>
                <p className="text-xs text-zinc-500">Envie o PDF, Word ou TXT que você já tem. Você revisa tudo antes de entrar no catálogo.</p>
              </div>
              <button type="button" onClick={close} disabled={step === 'reading' || step === 'saving'} aria-label="Fechar" className="rounded p-1 text-zinc-400 hover:text-zinc-100 disabled:opacity-40">
                <X className="h-5 w-5" />
              </button>
            </div>

            {(step === 'pick' || step === 'reading') && (
              <div className="flex flex-col gap-3">
                <label className="flex flex-col gap-1 text-xs font-medium text-zinc-400">
                  Arquivo (PDF com texto, DOCX ou TXT, até 4 MB)
                  <input
                    ref={fileRef}
                    type="file"
                    accept=".pdf,.docx,.txt,application/pdf,text/plain,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
                    disabled={step === 'reading'}
                    onChange={(e) => setFileName(e.target.files?.[0]?.name ?? '')}
                    className={`${inputCls} file:mr-3 file:rounded file:border-0 file:bg-zinc-800 file:px-2 file:py-1 file:text-zinc-200`}
                  />
                </label>
                <ul className="list-disc space-y-1 pl-4 text-xs text-zinc-500">
                  <li>O texto do arquivo é enviado ao Google (Gemini) para identificar as músicas e esse conteúdo pode ser usado para melhorar os produtos deles: não envie dados sensíveis (senhas, telefones, CPFs).</li>
                  <li>Depois de importar, você pode editar todas as músicas e o repertório.</li>
                  <li>PDF escaneado (foto) não é lido.</li>
                </ul>
                {error && <p className="rounded-md border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-300">{error}</p>}
                {step === 'reading' && <ReadProgress what={fileName || 'o documento'} />}
                <div className="flex justify-end gap-2">
                  <button type="button" onClick={close} disabled={step === 'reading'} className="rounded-md px-4 py-2 text-sm text-zinc-400 hover:text-zinc-200 disabled:opacity-40">
                    Cancelar
                  </button>
                  <button type="button" onClick={read} disabled={step === 'reading' || !fileName} className="rounded-md bg-zinc-100 px-4 py-2 text-sm font-bold text-zinc-900 hover:bg-white disabled:opacity-50">
                    Ler documento
                  </button>
                </div>
              </div>
            )}

            {(step === 'review' || step === 'saving') && (
              <div className="flex flex-col gap-4">
                <label className="flex flex-col gap-1 text-xs font-medium text-zinc-400">
                  Nome do repertório
                  <input value={setlistName} onChange={(e) => setSetlistName(e.target.value)} maxLength={80} placeholder="Ex: Repertório 2026" className={inputCls} />
                </label>

                <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-xs text-zinc-400">
                  <span>
                    {all.length} {all.length === 1 ? 'música' : 'músicas'} em {blocks.length} {blocks.length === 1 ? 'bloco' : 'blocos'}
                  </span>
                  {reused > 0 && <span>{reused} já no catálogo</span>}
                  <span className={pending > 0 ? 'font-semibold text-amber-400' : ''}>{pending} com dados faltando</span>
                  <label className="ml-auto flex items-center gap-2 text-zinc-300">
                    <input type="checkbox" checked={onlyPending} onChange={(e) => setOnlyPending(e.target.checked)} className="h-4 w-4 accent-zinc-100" />
                    Só as que faltam informação (nome, tom ou artista)
                  </label>
                </div>

                {onlyPending && pending === 0 && <p className="rounded-md border border-zinc-800 bg-zinc-900 px-3 py-3 text-sm text-zinc-300">Nenhuma música com dados faltando.</p>}

                <div className="flex flex-col gap-4">
                  {blocks.map((b) => {
                    const rows = onlyPending ? b.rows.filter((r) => pendingOf(r).length > 0) : b.rows;
                    if (rows.length === 0) return null;
                    return (
                      <section key={b.id} className="rounded-lg border border-zinc-800">
                        <div className="flex items-center gap-2 border-b border-zinc-800 bg-zinc-900/60 px-3 py-2">
                          <input
                            value={b.name}
                            onChange={(e) => setBlocks((bs) => bs.map((x) => (x.id === b.id ? { ...x, name: e.target.value } : x)))}
                            placeholder="Bloco sem nome"
                            maxLength={80}
                            aria-label="Nome do bloco"
                            className={`${inputCls} font-semibold`}
                          />
                          <span className="shrink-0 text-xs text-zinc-500">{b.rows.length}</span>
                          <button
                            type="button"
                            onClick={() => setBlocks((bs) => bs.filter((x) => x.id !== b.id))}
                            aria-label="Remover bloco"
                            title="Remover bloco"
                            className="shrink-0 rounded p-1 text-zinc-500 hover:text-red-400"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                        <ul className="divide-y divide-zinc-800/70">
                          {rows.map((r) => {
                            const missing = pendingOf(r);
                            return (
                              <li key={r.id} className={`px-3 py-2 ${missing.length > 0 ? 'border-l-2 border-amber-500/70 bg-amber-500/5' : ''}`}>
                                <div className="grid grid-cols-[1fr_auto] items-start gap-2 md:grid-cols-[2fr_1.4fr_5.5rem_auto]">
                                  <input
                                    value={r.title}
                                    onChange={(e) => patchRow(b.id, r.id, { title: e.target.value, ...(r.existing && titleKey(e.target.value) !== titleKey(r.existing.title) ? { useExisting: false } : {}) })}
                                    placeholder="Nome da música"
                                    aria-label="Nome da música"
                                    className={`${inputCls} ${!r.title.trim() ? 'border-red-500/60' : ''}`}
                                  />
                                  <button
                                    type="button"
                                    onClick={() => setBlocks((bs) => bs.map((x) => (x.id === b.id ? { ...x, rows: x.rows.filter((y) => y.id !== r.id) } : x)))}
                                    aria-label="Remover música"
                                    title="Remover música"
                                    className="rounded p-1.5 text-zinc-500 hover:text-red-400 md:order-4"
                                  >
                                    <Trash2 className="h-4 w-4" />
                                  </button>
                                  <input
                                    value={r.artist}
                                    onChange={(e) => patchRow(b.id, r.id, { artist: e.target.value })}
                                    placeholder="Artista"
                                    aria-label="Artista"
                                    disabled={r.useExisting}
                                    className={`${inputCls} disabled:opacity-40`}
                                  />
                                  <select value={r.key} onChange={(e) => patchRow(b.id, r.id, { key: e.target.value })} aria-label="Tom" disabled={r.useExisting} className={`${inputCls} disabled:opacity-40`}>
                                    <option value="">Tom</option>
                                    {MUSICAL_KEYS.map((k) => (
                                      <option key={k} value={k}>
                                        {k}
                                      </option>
                                    ))}
                                  </select>
                                </div>
                                {(missing.length > 0 || r.existing || seen.has(r.id) || r.note || r.lyricHint) && (
                                  <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px]">
                                    {missing.length > 0 && (
                                      <span className="inline-flex items-center gap-1 font-semibold text-amber-400">
                                        <TriangleAlert className="h-3 w-3" /> Falta: {missing.map((m) => (m === 'title' ? 'nome' : m === 'key' ? 'tom' : 'artista')).join(', ')}
                                      </span>
                                    )}
                                    {r.existing && (
                                      <label className="inline-flex items-center gap-1.5 text-sky-300">
                                        <input type="checkbox" checked={r.useExisting} onChange={(e) => patchRow(b.id, r.id, { useExisting: e.target.checked })} className="h-3.5 w-3.5 accent-sky-400" />
                                        Já está no catálogo: usar a existente
                                      </label>
                                    )}
                                    {seen.has(r.id) && <span className="text-zinc-500">Repetida no arquivo (vira uma só no catálogo)</span>}
                                    {r.lyricHint && <span className="text-zinc-500">Começa com “{r.lyricHint}”</span>}
                                    {r.note && <span className="text-zinc-500">Obs.: {r.note}</span>}
                                  </div>
                                )}
                              </li>
                            );
                          })}
                        </ul>
                      </section>
                    );
                  })}
                </div>

                <p className="text-xs text-zinc-500">Nada fica salvo até você clicar em importar. Músicas sem tom ou artista entram assim mesmo e você completa depois no catálogo.</p>

                <div className="sticky bottom-0 -mx-4 flex flex-wrap items-center justify-end gap-2 border-t border-zinc-800 bg-zinc-950 px-4 py-3 md:-mx-5 md:px-5">
                  <button type="button" onClick={reset} disabled={step === 'saving'} className="rounded-md px-4 py-2 text-sm text-zinc-400 hover:text-zinc-200 disabled:opacity-40">
                    Escolher outro arquivo
                  </button>
                  <button
                    type="button"
                    onClick={save}
                    disabled={invalid || step === 'saving'}
                    className="inline-flex items-center gap-2 rounded-md bg-zinc-100 px-4 py-2 text-sm font-bold text-zinc-900 hover:bg-white disabled:opacity-50"
                  >
                    {step === 'saving' && <Loader2 className="h-4 w-4 animate-spin" />}
                    {step === 'saving' ? 'Importando...' : `Importar ${all.length} ${all.length === 1 ? 'música' : 'músicas'} e criar o repertório`}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
}
