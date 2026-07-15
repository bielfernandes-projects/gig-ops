'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Plus, X, Loader2, Copy, Volume2, VolumeX, Users, Trash2, Bell } from 'lucide-react';
import { DateTimePicker } from './date-time-picker';
import { addQuickGig } from '@/app/actions/gig-actions';
import { GoGig, GoProject, GoMember } from '@/lib/types';
import { toast } from 'sonner';

interface LineupEntry {
  member_id: string;
  name: string;
  instrument: string;
  fee_amount: number;
}

export function QuickAddGig({ projects, members, cloneData }: { projects: GoProject[]; members: GoMember[]; cloneData?: Partial<GoGig> | null }) {
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);
  const [isPending, setIsPending] = useState(false);
  const [recurrence, setRecurrence] = useState('none');
  const [recurrenceEnd, setRecurrenceEnd] = useState('1month');
  const [bringSound, setBringSound] = useState(false);
  const [lineup, setLineup] = useState<LineupEntry[]>([]);
  const [reminderMinutes, setReminderMinutes] = useState<number[]>([]);
  const [endDefault, setEndDefault] = useState('');
  const [endKey, setEndKey] = useState(0);
  const isClone = !!cloneData;

  useEffect(() => {
    if (cloneData) {
      setIsOpen(true);
      if (cloneData.bring_sound) setBringSound(true);
      const url = new URL(window.location.href);
      url.searchParams.delete('cloneId');
      window.history.replaceState({}, '', url.toString());
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (isOpen) {
      document.documentElement.classList.add('modal-open');
    } else {
      document.documentElement.classList.remove('modal-open');
    }
    return () => document.documentElement.classList.remove('modal-open');
  }, [isOpen]);

  const handleStartTimeChange = useCallback((isoValue: string) => {
    if (!isoValue) return;
    const start = new Date(isoValue);
    start.setHours(start.getHours() + 2);
    const pad = (n: number) => String(n).padStart(2, '0');
    setEndDefault(`${start.getFullYear()}-${pad(start.getMonth() + 1)}-${pad(start.getDate())}T${pad(start.getHours())}:${pad(start.getMinutes())}`);
    setEndKey(k => k + 1);
  }, []);

  const addLineupMember = (memberId: string) => {
    const member = members.find(m => m.id === memberId);
    if (!member) return;
    if (lineup.some(l => l.member_id === memberId)) {
      toast.warning('Músico já está na escala.');
      return;
    }
    setLineup(prev => [...prev, {
      member_id: member.id,
      name: member.name,
      instrument: member.instrument,
      fee_amount: 0,
    }]);
  };

  const removeLineupMember = (memberId: string) => {
    setLineup(prev => prev.filter(l => l.member_id !== memberId));
  };

  const updateLineupFee = (memberId: string, fee: number) => {
    setLineup(prev => prev.map(l => l.member_id === memberId ? { ...l, fee_amount: fee } : l));
  };

  const toggleReminder = (minutes: number) => {
    setReminderMinutes(prev => 
      prev.includes(minutes) 
        ? prev.filter(m => m !== minutes)
        : [...prev, minutes]
    );
  };

  const REMINDER_PRESETS = [
    { minutes: 10080, label: '1 sem', short: '7d' },
    { minutes: 2880, label: '2 dias', short: '2d' },
    { minutes: 1440, label: '1 dia', short: '1d' },
    { minutes: 720, label: '12h', short: '12h' },
    { minutes: 180, label: '3h', short: '3h' },
    { minutes: 60, label: '1h', short: '1h' },
  ];

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsPending(true);
    const formData = new FormData(e.currentTarget);
    
    formData.set('bring_sound', String(bringSound));
    if (!bringSound) {
      formData.set('sound_cost', '0');
      formData.set('sound_person_id', '');
    }
    formData.set('lineup', JSON.stringify(lineup));
    formData.set('reminder_minutes', JSON.stringify(reminderMinutes));
    
    const res = await addQuickGig(formData);
    
    if (res.error) {
      toast.error(`Erro ao salvar: ${res.error}`);
      setIsPending(false);
    } else {
      setIsOpen(false);
      setIsPending(false);
      setBringSound(false);
      setLineup([]);
      setRecurrence('none');
      toast.success(isClone ? 'Gig duplicada com sucesso!' : 'Gig agendada com sucesso!');
      if (isClone) router.push('/agenda');
    }
  };

  const availableMembers = members.filter(m => !lineup.some(l => l.member_id === m.id));

  return (
    <>
      <button 
        onClick={() => setIsOpen(true)}
        className="fixed bottom-[88px] md:bottom-10 right-4 md:right-10 z-40 flex items-center justify-center w-14 h-14 bg-zinc-100 text-zinc-900 rounded-full hover:bg-white hover:scale-105 active:scale-95 transition-all shadow-xl select-none"
        title="Nova Gig"
      >
        <Plus className="w-6 h-6 stroke-[2.5]" />
      </button>

      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-start justify-center p-4 overflow-y-auto">
          <div 
            className="absolute inset-0 bg-black/80 backdrop-blur-sm"
            onClick={() => !isPending && setIsOpen(false)}
            aria-hidden="true"
          />
          
          <div className="relative w-full max-w-md bg-zinc-950 border border-zinc-800 rounded-xl shadow-2xl p-6 my-8">
            <div className="flex items-center justify-between mb-5">
              <div className="flex items-center gap-2">
                {isClone && <Copy className="w-4 h-4 text-emerald-400" />}
                <h2 className="text-xl font-bold tracking-tight text-zinc-100">
                  {isClone ? 'Duplicar Gig' : 'Novo Show'}
                </h2>
              </div>
              <button 
                onClick={() => !isPending && setIsOpen(false)}
                disabled={isPending}
                className="p-1 rounded-full text-zinc-500 hover:text-zinc-200 hover:bg-zinc-800 transition-colors disabled:opacity-50"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="flex flex-col gap-4">
              <input type="hidden" name="clone_id" value={cloneData?.id || ''} />

              <div className="flex flex-col gap-1.5">
                <label htmlFor="title" className="text-xs font-semibold text-zinc-400 uppercase tracking-widest">
                  Titulo <span className="text-red-400">*</span>
                </label>
                <input 
                  type="text" 
                  id="title" 
                  name="title" 
                  required 
                  autoFocus={!isClone}
                  defaultValue={cloneData?.title ?? ''}
                  className="w-full bg-zinc-900 border border-zinc-800 rounded-md px-3 py-2 text-sm text-zinc-100 focus:outline-none focus:border-emerald-500/50 focus:ring-1 focus:ring-emerald-500/50 transition-all placeholder-zinc-700"
                  placeholder="Ex: Show Sesc Paulista"
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <label htmlFor="project_id" className="text-xs font-semibold text-zinc-400 uppercase tracking-widest">
                  Projeto <span className="text-red-400">*</span>
                </label>
                <select 
                  id="project_id" 
                  name="project_id" 
                  required
                  defaultValue={cloneData?.project_id ?? ''}
                  className="w-full bg-zinc-900 border border-zinc-800 rounded-md px-3 py-2 text-sm text-zinc-100 focus:outline-none focus:border-emerald-500/50 focus:ring-1 focus:ring-emerald-500/50 transition-all appearance-none"
                >
                  <option value="" disabled>Selecione o Projeto</option>
                  {projects.map((p) => (
                    <option key={p.id} value={p.id}>{p.name}</option>
                  ))}
                </select>
              </div>

              <div className="flex flex-col gap-1.5">
                <label htmlFor="location" className="text-xs font-semibold text-zinc-400 uppercase tracking-widest">
                  Local / Endereco
                </label>
                <input 
                  type="text" 
                  id="location" 
                  name="location" 
                  defaultValue={cloneData?.location === 'A definir' ? '' : (cloneData?.location ?? '')}
                  placeholder="Rua das Flores, 100 - Sao Paulo"
                  className="w-full bg-zinc-900 border border-zinc-800 rounded-md px-3 py-2 text-sm text-zinc-100 focus:outline-none focus:border-emerald-500/50 focus:ring-1 focus:ring-emerald-500/50 transition-all placeholder-zinc-700"
                />
              </div>

              <DateTimePicker
                name="start_time"
                label="Inicio"
                required
                onChange={handleStartTimeChange}
              />

              <DateTimePicker
                key={`end-${endKey}`}
                name="end_time"
                label="Termino (opcional)"
                defaultValue={endDefault}
              />

              <div className="flex flex-col gap-1.5">
                <label htmlFor="gross_value" className="text-xs font-semibold text-zinc-400 uppercase tracking-widest">
                  Valor Bruto (Cache) <span className="text-red-400">*</span>
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <span className="text-zinc-500 text-sm font-semibold">R$</span>
                  </div>
                  <input 
                    type="number" 
                    id="gross_value" 
                    name="gross_value" 
                    inputMode="decimal"
                    placeholder="0.00"
                    step="0.01"
                    required 
                    defaultValue={cloneData?.gross_value ?? ''}
                    className="w-full bg-zinc-900 border border-zinc-800 rounded-md pl-9 pr-3 py-2 text-sm text-zinc-100 focus:outline-none focus:border-emerald-500/50 focus:ring-1 focus:ring-emerald-500/50 transition-all"
                  />
                </div>
              </div>

              {/* Sound Equipment */}
              <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    {bringSound
                      ? <Volume2 className="w-5 h-5 text-amber-400" />
                      : <VolumeX className="w-5 h-5 text-zinc-500" />
                    }
                    <div>
                      <p className="text-sm font-semibold text-zinc-200">Levar Equipamento de Som?</p>
                      <p className="text-xs text-zinc-500">
                        {bringSound ? 'Sim - informe o custo abaixo' : 'Nao e necessario'}
                      </p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setBringSound(!bringSound)}
                    className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none ${
                      bringSound ? 'bg-amber-500' : 'bg-zinc-700'
                    }`}
                  >
                    <span className={`inline-block size-4 transform rounded-full bg-white transition-transform ${
                      bringSound ? 'translate-x-6' : 'translate-x-1'
                    }`} />
                  </button>
                </div>

                {bringSound && (
                  <div className="mt-4 flex flex-col gap-3 animate-in fade-in slide-in-from-top-2 duration-200">
                    <div className="flex flex-col gap-1.5">
                      <label htmlFor="qs-sound-cost" className="text-xs font-semibold text-zinc-400 uppercase tracking-widest">
                        Custo do Som
                      </label>
                      <div className="relative">
                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                          <span className="text-zinc-500 text-sm font-semibold">R$</span>
                        </div>
                        <input
                          type="number"
                          id="qs-sound-cost"
                          name="sound_cost"
                          placeholder="0.00"
                          step="0.01"
                          inputMode="decimal"
                          className="w-full bg-zinc-950 border border-zinc-700 rounded-md pl-9 pr-3 py-2 text-sm text-zinc-100 focus:outline-none focus:border-amber-500/50 focus:ring-1 focus:ring-amber-500/50 transition-all placeholder:text-zinc-600"
                        />
                      </div>
                    </div>

                    <div className="flex flex-col gap-1.5">
                      <label htmlFor="qs-sound-person" className="text-xs font-semibold text-zinc-400 uppercase tracking-widest">
                        Responsavel pelo Som
                      </label>
                      <select
                        id="qs-sound-person"
                        name="sound_person_id"
                        className="w-full bg-zinc-950 border border-zinc-700 rounded-md px-3 py-2 text-sm text-zinc-100 focus:outline-none focus:border-amber-500/50 focus:ring-1 focus:ring-amber-500/50 transition-all appearance-none"
                      >
                        <option value="">Nenhum (a definir)</option>
                        {members.map((m) => (
                          <option key={m.id} value={m.id}>
                            {m.name} - {m.instrument}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                )}
              </div>

              {/* Lineup / Escalacao */}
              <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4">
                <div className="flex items-center gap-3 mb-3">
                  <Users className="w-5 h-5 text-indigo-400" />
                  <p className="text-sm font-semibold text-zinc-200">Escala de Musicos</p>
                  {lineup.length > 0 && (
                    <span className="ml-auto text-[10px] font-bold px-2 py-0.5 rounded-md bg-indigo-500/10 text-indigo-400">
                      {lineup.length} {lineup.length === 1 ? 'escalado' : 'escalados'}
                    </span>
                  )}
                </div>

                {lineup.length > 0 && (
                  <div className="flex flex-col gap-2 mb-3">
                    {lineup.map(entry => (
                      <div key={entry.member_id} className="flex items-center gap-2 bg-zinc-950 border border-zinc-800 rounded-lg p-2.5">
                        <div className="flex flex-col min-w-0 flex-1">
                          <span className="text-xs font-bold text-zinc-200 truncate">{entry.name}</span>
                          <span className="text-[10px] text-zinc-500 uppercase tracking-wider">{entry.instrument}</span>
                        </div>
                        <div className="relative shrink-0">
                          <div className="absolute inset-y-0 left-0 pl-2 flex items-center pointer-events-none">
                            <span className="text-zinc-600 text-[10px] font-semibold">R$</span>
                          </div>
                          <input
                            type="number"
                            value={entry.fee_amount || ''}
                            onChange={e => updateLineupFee(entry.member_id, parseFloat(e.target.value) || 0)}
                            placeholder="0"
                            step="0.01"
                            inputMode="decimal"
                            className="w-24 bg-zinc-900 border border-zinc-700 rounded-md pl-6 pr-2 py-1.5 text-xs text-zinc-100 focus:outline-none focus:border-indigo-500/50 focus:ring-1 focus:ring-indigo-500/50 transition-all"
                          />
                        </div>
                        <button
                          type="button"
                          onClick={() => removeLineupMember(entry.member_id)}
                          className="p-1.5 text-zinc-600 hover:text-red-400 hover:bg-red-500/10 rounded-md transition-colors shrink-0"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}

                {availableMembers.length > 0 && (
                  <select
                    onChange={e => { if (e.target.value) { addLineupMember(e.target.value); e.target.value = ''; } }}
                    className="w-full bg-zinc-950 border border-zinc-800 rounded-md px-3 py-2 text-sm text-zinc-400 focus:outline-none focus:border-indigo-500/50 focus:ring-1 focus:ring-indigo-500/50 transition-all appearance-none"
                  >
                    <option value="">+ Adicionar musico a escala...</option>
                    {availableMembers.map(m => (
                      <option key={m.id} value={m.id}>{m.name} - {m.instrument}</option>
                    ))}
                  </select>
                )}

                {members.length === 0 && (
                  <p className="text-[10px] text-zinc-500 font-medium">Nenhum membro cadastrado. Cadastre membros primeiro.</p>
                )}
              </div>

              <div className="flex flex-col gap-1.5">
                <label htmlFor="recurrence" className="text-xs font-semibold text-zinc-400 uppercase tracking-widest">
                  Repeticao
                </label>
                <select 
                  id="recurrence" 
                  name="recurrence" 
                  value={recurrence}
                  onChange={(e) => setRecurrence(e.target.value)}
                  className="w-full bg-zinc-900 border border-zinc-800 rounded-md px-3 py-2 text-sm text-zinc-100 focus:outline-none focus:border-emerald-500/50 focus:ring-1 focus:ring-emerald-500/50 transition-all appearance-none"
                >
                  <option value="none">Evento Unico</option>
                  <option value="weekly">Semanal</option>
                  <option value="biweekly">Quinzenal</option>
                  <option value="monthly">Mensal</option>
                </select>
              </div>

              {recurrence !== 'none' && (
                <div className="flex flex-col gap-1.5 animate-in fade-in slide-in-from-top-2 duration-200 p-3 bg-zinc-900/50 border border-zinc-800 rounded-xl">
                  <label className="text-[11px] font-semibold text-emerald-400 uppercase tracking-widest mb-1">
                    Termino da Recorrencia
                  </label>
                  <select 
                    name="recurrence_end"
                    value={recurrenceEnd}
                    onChange={(e) => setRecurrenceEnd(e.target.value)}
                    className="w-full bg-zinc-950 border border-zinc-800 rounded-md px-3 py-2 text-sm text-zinc-100 focus:outline-none transition-all appearance-none"
                  >
                    <option value="1month">Termina em 1 Mes</option>
                    <option value="3months">Termina em 3 Meses</option>
                    <option value="6months">Termina em 6 Meses</option>
                    <option value="1year">Termina em 1 Ano</option>
                    <option value="custom">Escolher data de termino</option>
                  </select>
                  {recurrenceEnd === 'custom' && (
                    <input type="date" name="custom_end_date" required className="mt-2 w-full bg-zinc-950 border border-zinc-800 rounded-md px-3 py-2 text-sm text-zinc-100 focus:outline-none transition-all" />
                  )}
                </div>
              )}

              <div className="flex flex-col gap-1.5">
                <label htmlFor="notes" className="text-xs font-semibold text-zinc-400 uppercase tracking-widest">
                  Observacoes <span className="text-zinc-600 normal-case font-normal">(opcional)</span>
                </label>
                <textarea 
                  id="notes" 
                  name="notes" 
                  rows={2}
                  placeholder="Contratante, consumacao..."
                  defaultValue={cloneData?.notes ?? ''}
                  className="w-full bg-zinc-900 border border-zinc-800 rounded-md px-3 py-2 text-sm text-zinc-100 focus:outline-none focus:border-emerald-500/50 focus:ring-1 focus:ring-emerald-500/50 transition-all resize-none placeholder:text-zinc-700"
                />
              </div>

              {/* Push Reminders */}
              <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4">
                <div className="flex items-center gap-3 mb-3">
                  <Bell className="w-5 h-5 text-amber-400" />
                  <p className="text-sm font-semibold text-zinc-200">Lembretes Push</p>
                  {reminderMinutes.length > 0 && (
                    <span className="ml-auto text-[10px] font-bold px-2 py-0.5 rounded-md bg-amber-500/10 text-amber-400">
                      {reminderMinutes.length} {reminderMinutes.length === 1 ? 'ativo' : 'ativos'}
                    </span>
                  )}
                </div>
                <p className="text-[10px] text-zinc-500 mb-3">Selecione quando enviar lembretes para os musicos escalados.</p>
                <div className="flex flex-wrap gap-2">
                  {REMINDER_PRESETS.map(preset => {
                    const active = reminderMinutes.includes(preset.minutes);
                    return (
                      <button
                        key={preset.minutes}
                        type="button"
                        onClick={() => toggleReminder(preset.minutes)}
                        className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all border ${
                          active
                            ? 'bg-amber-500/20 text-amber-400 border-amber-500/30'
                            : 'bg-zinc-950 text-zinc-400 border-zinc-800 hover:border-zinc-700 hover:text-zinc-300'
                        }`}
                      >
                        {preset.label}
                      </button>
                    );
                  })}
                </div>
              </div>

              <button 
                type="submit" 
                disabled={isPending}
                className="mt-2 w-full flex items-center justify-center gap-2 bg-zinc-100 hover:bg-white text-zinc-950 font-bold py-2.5 rounded-md transition-colors active:scale-[0.98] disabled:opacity-70 disabled:cursor-not-allowed select-none"
              >
                {isPending ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Salvar Gig'}
              </button>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
