'use client';

import { useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { FileUp, Loader2, Trash2, TriangleAlert, X } from 'lucide-react';
import { ReadProgress } from '@/components/read-progress';
import { saveImportedGigs } from '@/app/actions/gig-import-actions';
import { gigInstant, missingGigFields, type GigImportResult } from '@/lib/gig-import-model';
import { dayKey, dayOffset } from '@/lib/time';
import type { GoProject } from '@/lib/types';

type BandChoice = { bandId: string; name: string };

type Row = { id: string; title: string; date: string; time: string; endTime: string; fee: string; project: string; location: string; notes: string };

const inputCls =
  'w-full bg-zinc-900 border border-zinc-800 rounded-md px-2.5 py-1.5 text-sm text-zinc-100 focus:outline-none focus:border-zinc-600 placeholder-zinc-600';
const brl = (n: number) => n.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
const uid = () => crypto.randomUUID();

const toRows = (r: GigImportResult): Row[] =>
  r.gigs.map((g) => ({ id: uid(), title: g.title, date: g.date ?? '', time: g.time ?? '', endTime: g.endTime ?? '', fee: g.fee == null ? '' : String(g.fee), project: g.project ?? '', location: g.location ?? '', notes: g.notes ?? '' }));

const pendingOf = (r: Row) => missingGigFields({ title: r.title, date: r.date || null, time: r.time || null });
const feeOf = (r: Row) => {
  const n = parseFloat(r.fee.replace(',', '.'));
  return Number.isFinite(n) && n >= 0 ? n : null;
};

export function ImportGigs({ bands, projects }: { bands: BandChoice[]; projects: GoProject[] }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState<'pick' | 'reading' | 'review' | 'saving'>('pick');
  const [mode, setMode] = useState<'paste' | 'file'>('paste');
  const [error, setError] = useState<string | null>(null);
  const [fileName, setFileName] = useState('');
  const [text, setText] = useState('');
  const [bandId, setBandId] = useState(bands[0]?.bandId ?? '');
  const [defaultProjectId, setDefaultProjectId] = useState('');
  const [rows, setRows] = useState<Row[]>([]);
  const [onlyPending, setOnlyPending] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const bandProjects = projects.filter((p) => p.band_id === bandId);
  const knownProject = (name: string) => bandProjects.some((p) => p.name.trim().toLowerCase() === name.trim().toLowerCase());
  const busy = step === 'reading' || step === 'saving';

  const reset = () => {
    setStep('pick');
    setError(null);
    setFileName('');
    setText('');
    setRows([]);
    setOnlyPending(false);
    setDefaultProjectId('');
  };
  const close = () => {
    if (busy) return;
    setOpen(false);
    reset();
  };

  const today = dayKey();
  // Mirror of SETTLED_AFTER_DAYS in saveImportedGigs: a row before this day is imported as already received.
  const settledBefore = dayOffset(today, -7);
  const pending = rows.filter((r) => pendingOf(r).length > 0).length;
  const past = rows.filter((r) => r.date && r.date < today).length;
  const total = useMemo(() => rows.reduce((s, r) => s + (feeOf(r) ?? 0), 0), [rows]);
  const patch = (id: string, p: Partial<Row>) => setRows((rs) => rs.map((r) => (r.id === id ? { ...r, ...p } : r)));

  async function read() {
    const file = mode === 'file' ? fileRef.current?.files?.[0] : null;
    if (mode === 'file' && !file) return setError('Escolha um arquivo.');
    if (mode === 'paste' && text.trim().length < 5) return setError('Cole o texto da lista.');
    setError(null);
    setStep('reading');
    const fd = new FormData();
    fd.set('band_id', bandId);
    if (file) fd.set('file', file);
    else fd.set('text', text);
    try {
      const res = await fetch('/api/gigs/importar', { method: 'POST', body: fd });
      const data = (await res.json().catch(() => ({}))) as GigImportResult & { error?: string };
      if (!res.ok) {
        setError(data.error ?? 'Não foi possível ler a lista.');
        return setStep('pick');
      }
      setRows(toRows(data));
      setStep('review');
    } catch {
      setError('Falha de conexão. Verifique a internet e tente de novo.');
      setStep('pick');
    }
  }

  async function save() {
    setStep('saving');
    const res = await saveImportedGigs({
      bandId,
      defaultProjectId: defaultProjectId || null,
      gigs: rows.map((r) => ({ title: r.title, date: r.date, time: r.time, endTime: r.endTime || null, fee: feeOf(r), project: r.project.trim() || null, location: r.location.trim() || null, notes: r.notes.trim() || null })),
    });
    if (!res || 'error' in res) {
      toast.error(res?.error ?? 'Não foi possível importar.');
      return setStep('review');
    }
    const { created, skipped, projectsCreated, settled } = res;
    toast.success(
      `${created} ${created === 1 ? 'gig importada' : 'gigs importadas'}${projectsCreated > 0 ? `, ${projectsCreated} ${projectsCreated === 1 ? 'projeto criado' : 'projetos criados'}` : ''}${settled > 0 ? `, ${settled} ${settled === 1 ? 'antiga já como cachê recebido' : 'antigas já como cachê recebido'}` : ''}${skipped > 0 ? `; ${skipped} já existia${skipped === 1 ? '' : 'm'} e ${skipped === 1 ? 'foi ignorada' : 'foram ignoradas'}` : ''}.`
    );
    setOpen(false);
    reset();
    router.refresh();
  }

  const needsDefault = rows.some((r) => !r.project.trim());
  const newProjects = new Set(rows.filter((r) => r.project.trim() && !knownProject(r.project)).map((r) => r.project.trim().toLowerCase())).size;
  const invalid = rows.length === 0 || pending > 0 || (needsDefault && !defaultProjectId);
  const shown = onlyPending ? rows.filter((r) => pendingOf(r).length > 0) : rows;

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="inline-flex items-center gap-2 rounded-md border border-zinc-700 px-4 py-2 text-sm font-semibold text-zinc-200 hover:bg-zinc-900"
      >
        <FileUp className="h-4 w-4" /> Importar gigs
      </button>

      {open && (
        <div className="fixed inset-0 z-[100] overflow-y-auto bg-black/70 px-3 py-6" role="dialog" aria-modal="true" aria-label="Importar gigs">
          <div className="mx-auto w-full max-w-3xl rounded-xl border border-zinc-800 bg-zinc-950 p-4 md:p-5">
            <div className="mb-4 flex items-start justify-between gap-3">
              <div>
                <h2 className="text-lg font-bold text-zinc-50">Importar gigs</h2>
                <p className="text-xs text-zinc-500">Cole uma lista ou envie um arquivo com data, horário, nome e cachê. Você revisa tudo antes de entrar na agenda.</p>
              </div>
              <button type="button" onClick={close} disabled={busy} aria-label="Fechar" className="rounded p-1 text-zinc-400 hover:text-zinc-100 disabled:opacity-40">
                <X className="h-5 w-5" />
              </button>
            </div>

            {(step === 'pick' || step === 'reading') && (
              <div className="flex flex-col gap-3">
                {bands.length > 1 && (
                  <label className="flex flex-col gap-1 text-xs font-medium text-zinc-400">
                    Banda
                    <select value={bandId} onChange={(e) => setBandId(e.target.value)} disabled={step === 'reading'} className={inputCls}>
                      {bands.map((b) => (
                        <option key={b.bandId} value={b.bandId}>
                          {b.name}
                        </option>
                      ))}
                    </select>
                  </label>
                )}

                <div className="flex gap-2 text-sm">
                  {(['paste', 'file'] as const).map((m) => (
                    <button
                      key={m}
                      type="button"
                      onClick={() => setMode(m)}
                      disabled={step === 'reading'}
                      className={`rounded-md px-3 py-1.5 font-medium ${mode === m ? 'bg-zinc-100 text-zinc-900' : 'border border-zinc-700 text-zinc-300 hover:bg-zinc-900'}`}
                    >
                      {m === 'paste' ? 'Colar texto' : 'Enviar arquivo'}
                    </button>
                  ))}
                </div>

                {mode === 'paste' ? (
                  <label className="flex flex-col gap-1 text-xs font-medium text-zinc-400">
                    Cole a lista (pode copiar direto do Excel, Google Planilhas ou WhatsApp)
                    <textarea
                      value={text}
                      onChange={(e) => setText(e.target.value)}
                      disabled={step === 'reading'}
                      rows={8}
                      maxLength={60000}
                      className={inputCls}
                    />
                  </label>
                ) : (
                  <label className="flex flex-col gap-1 text-xs font-medium text-zinc-400">
                    Arquivo (CSV, TXT, DOCX ou PDF com texto, até 4 MB)
                    <input
                      ref={fileRef}
                      type="file"
                      accept=".csv,.txt,.docx,.pdf,text/csv,text/plain,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
                      disabled={step === 'reading'}
                      onChange={(e) => setFileName(e.target.files?.[0]?.name ?? '')}
                      className={`${inputCls} file:mr-3 file:rounded file:border-0 file:bg-zinc-800 file:px-2 file:py-1 file:text-zinc-200`}
                    />
                  </label>
                )}

                <div className="rounded-md border border-zinc-800 bg-zinc-900/60 px-3 py-2.5 text-xs text-zinc-400">
                  <p className="font-semibold text-zinc-300">Cole do jeito que a lista vier.</p>
                  <p className="mt-1">
                    A leitura entende planilha, tabela, recado de WhatsApp e agenda em tópicos, em qualquer ordem de colunas, com ou sem rótulos. Não precisa reescrever nada — e você
                    confere tudo na próxima tela antes de salvar.
                  </p>
                  <p className="mt-2 text-zinc-500">
                    Se você for <span className="text-zinc-300">digitar do zero</span>, esta ordem é a que erra menos (uma gig por linha):
                  </p>
                  <p className="mt-1 font-mono text-[11px] text-zinc-300">data | início | término | título | projeto | cachê</p>
                  <p className="mt-1 font-mono text-[11px] text-zinc-500">24/05/2026 | 20:00 | 23:00 | Sunrise | Grupo Deixa em Off | Cachê: R$ 150,00</p>
                  <p className="mt-1">Só data, horário e título são necessários; término, projeto e cachê entram quando a lista tiver.</p>
                </div>

                <ul className="list-disc space-y-1 pl-4 text-xs text-zinc-500">
                  <li>O texto é enviado ao Google (Gemini) para identificar as gigs e esse conteúdo pode ser usado para melhorar os produtos deles: não envie dados sensíveis (senhas, telefones, CPFs).</li>
                  <li>Depois de importar, você pode editar todos os dados de cada gig.</li>
                  <li>Planilha Excel (.xlsx): copie as células e cole aqui, ou salve como CSV.</li>
                  <li>Gigs de mais de uma semana atrás entram como já realizadas e com o cachê recebido. As da última semana ficam pendentes de recebimento.</li>
                </ul>
                {error && <p className="rounded-md border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-300">{error}</p>}
                {step === 'reading' && <ReadProgress what={fileName || 'a lista'} />}
                <div className="flex justify-end gap-2">
                  <button type="button" onClick={close} disabled={step === 'reading'} className="rounded-md px-4 py-2 text-sm text-zinc-400 hover:text-zinc-200 disabled:opacity-40">
                    Cancelar
                  </button>
                  <button
                    type="button"
                    onClick={read}
                    disabled={step === 'reading' || (mode === 'file' ? !fileName : text.trim().length < 5)}
                    className="rounded-md bg-zinc-100 px-4 py-2 text-sm font-bold text-zinc-900 hover:bg-white disabled:opacity-50"
                  >
                    Ler lista
                  </button>
                </div>
              </div>
            )}

            {(step === 'review' || step === 'saving') && (
              <div className="flex flex-col gap-4">
                <datalist id="import-projects">
                  {bandProjects.map((p) => (
                    <option key={p.id} value={p.name} />
                  ))}
                </datalist>
                {needsDefault && (
                  <label className="flex flex-col gap-1 text-xs font-medium text-zinc-400">
                    Projeto das gigs que não indicam a banda <span className="text-red-400">*</span>
                    <select value={defaultProjectId} onChange={(e) => setDefaultProjectId(e.target.value)} className={`${inputCls} ${!defaultProjectId ? 'border-amber-500/60' : ''}`}>
                      <option value="">Selecione o projeto</option>
                      {bandProjects.map((p) => (
                        <option key={p.id} value={p.id}>
                          {p.name}
                        </option>
                      ))}
                    </select>
                    {bandProjects.length === 0 && <span className="text-amber-400">Esta banda ainda não tem projeto: preencha o campo Projeto em cada gig (o projeto é criado na importação).</span>}
                  </label>
                )}

                <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-xs text-zinc-400">
                  <span>
                    {rows.length} {rows.length === 1 ? 'gig' : 'gigs'} · cachê somado {brl(total)}
                  </span>
                  {newProjects > 0 && <span className="text-sky-300">{newProjects} {newProjects === 1 ? 'projeto novo será criado' : 'projetos novos serão criados'}</span>}
                  {past > 0 && <span>{past} em data passada</span>}
                  <span className={pending > 0 ? 'font-semibold text-amber-400' : ''}>{pending} com dados faltando</span>
                  <label className="ml-auto flex items-center gap-2 text-zinc-300">
                    <input type="checkbox" checked={onlyPending} onChange={(e) => setOnlyPending(e.target.checked)} className="h-4 w-4 accent-zinc-100" />
                    Só as que faltam informação
                  </label>
                </div>

                {onlyPending && pending === 0 && <p className="rounded-md border border-zinc-800 bg-zinc-900 px-3 py-3 text-sm text-zinc-300">Nenhuma gig com dados faltando.</p>}

                <ul className="divide-y divide-zinc-800/70 rounded-lg border border-zinc-800">
                  {shown.map((r) => {
                    const missing = pendingOf(r);
                    return (
                      <li key={r.id} className={`px-3 py-2 ${missing.length > 0 ? 'border-l-2 border-amber-500/70 bg-amber-500/5' : ''}`}>
                        <div className="grid grid-cols-[1fr_auto] items-start gap-2 md:grid-cols-[2fr_1.3fr_8.5rem_5.5rem_5.5rem_6.5rem_auto]">
                          <input value={r.title} onChange={(e) => patch(r.id, { title: e.target.value })} placeholder="Nome da gig" aria-label="Nome da gig" className={`${inputCls} ${!r.title.trim() ? 'border-red-500/60' : ''}`} />
                          <button
                            type="button"
                            onClick={() => setRows((rs) => rs.filter((x) => x.id !== r.id))}
                            aria-label="Remover gig"
                            title="Remover gig"
                            className="rounded p-1.5 text-zinc-500 hover:text-red-400 md:order-7"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                          <input list="import-projects" value={r.project} onChange={(e) => patch(r.id, { project: e.target.value })} placeholder="Projeto / banda" aria-label="Projeto ou banda" className={inputCls} />
                          <input type="date" value={r.date} onChange={(e) => patch(r.id, { date: e.target.value })} aria-label="Data" className={`${inputCls} ${!r.date ? 'border-red-500/60' : ''}`} />
                          <input type="time" value={r.time} onChange={(e) => patch(r.id, { time: e.target.value })} aria-label="Horário" className={`${inputCls} ${!r.time ? 'border-red-500/60' : ''}`} />
                          <input type="time" value={r.endTime} onChange={(e) => patch(r.id, { endTime: e.target.value })} aria-label="Horário final" title="Horário final" className={inputCls} />
                          <input type="number" min="0" step="0.01" inputMode="decimal" value={r.fee} onChange={(e) => patch(r.id, { fee: e.target.value })} placeholder="Cachê" aria-label="Cachê" className={inputCls} />
                        </div>
                        {(missing.length > 0 || (r.project.trim() && !knownProject(r.project)) || r.location || r.notes || (r.date && r.date < settledBefore) || (r.date && r.time && gigInstant(r.date, r.time) < new Date().toISOString())) && (
                          <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px]">
                            {missing.length > 0 && (
                              <span className="inline-flex items-center gap-1 font-semibold text-amber-400">
                                <TriangleAlert className="h-3 w-3" /> Falta: {missing.map((m) => (m === 'title' ? 'nome' : m === 'date' ? 'data' : 'horário')).join(', ')}
                              </span>
                            )}
                            {r.project.trim() && !knownProject(r.project) && <span className="text-sky-300">Projeto novo: {r.project.trim()}</span>}
                            {r.date && r.date < settledBefore ? (
                              <span className="text-emerald-400/80">Entra como realizada e cachê recebido</span>
                            ) : (
                              r.date && r.time && gigInstant(r.date, r.time) < new Date().toISOString() && <span className="text-zinc-500">Data passada</span>
                            )}
                            {r.location && <span className="text-zinc-500">Local: {r.location}</span>}
                            {r.notes && <span className="text-zinc-500">Obs.: {r.notes}</span>}
                          </div>
                        )}
                      </li>
                    );
                  })}
                </ul>

                <p className="text-xs text-zinc-500">Nada fica salvo até você clicar em importar. As gigs entram sem escala de músicos; você escala depois. Projetos que ainda não existem na banda são criados. Gigs com mesmo nome e horário que já existem na agenda são ignoradas.</p>

                <div className="sticky bottom-0 -mx-4 flex flex-wrap items-center justify-end gap-2 border-t border-zinc-800 bg-zinc-950 px-4 py-3 md:-mx-5 md:px-5">
                  <button type="button" onClick={reset} disabled={step === 'saving'} className="rounded-md px-4 py-2 text-sm text-zinc-400 hover:text-zinc-200 disabled:opacity-40">
                    Ler outra lista
                  </button>
                  <button
                    type="button"
                    onClick={save}
                    disabled={invalid || step === 'saving'}
                    className="inline-flex items-center gap-2 rounded-md bg-zinc-100 px-4 py-2 text-sm font-bold text-zinc-900 hover:bg-white disabled:opacity-50"
                  >
                    {step === 'saving' && <Loader2 className="h-4 w-4 animate-spin" />}
                    {step === 'saving' ? 'Importando...' : `Importar ${rows.length} ${rows.length === 1 ? 'gig' : 'gigs'}`}
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
