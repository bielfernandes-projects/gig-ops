'use client';

import { useRouter, useSearchParams, usePathname } from 'next/navigation';
import { GoProject } from '@/lib/types';

const FILTERS = [
  { key: '7days', label: '7 Dias' },
  { key: 'month', label: 'Este Mês' },
  { key: 'all', label: 'Completa' },
  { key: 'custom', label: 'Personalizado' },
] as const;

export function FilterTabs({ projects = [] }: { projects?: GoProject[] }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const pathname = usePathname();
  const project = searchParams.get('project') || 'all';
  const active = searchParams.get('tab') || '7days';
  const from = searchParams.get('from') || '';
  const to = searchParams.get('to') || '';

  const handleChange = (key: string) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set('tab', key);
    if (key !== 'custom') {
      params.delete('from');
      params.delete('to');
    }
    router.push(`${pathname}?${params.toString()}`);
  };

  const handleParamChange = (key: string, value: string) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set(key, value);
    router.push(`${pathname}?${params.toString()}`);
  };

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center gap-2">
        <div className="flex-1 flex gap-1.5 p-1 bg-zinc-900 border border-zinc-800 rounded-xl select-none overflow-x-auto hide-scrollbar" role="tablist">
          {FILTERS.map(({ key, label }) => {
            const isActive = active === key;
            return (
              <button
                key={key}
                role="tab"
                aria-selected={isActive}
                onClick={() => handleChange(key)}
                className={`flex-1 min-w-[80px] py-1.5 px-2 text-[10px] font-black uppercase tracking-wider rounded-lg transition-all ${
                  isActive
                    ? 'bg-zinc-100 text-zinc-950 shadow-sm'
                    : 'text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800'
                }`}
              >
                {label}
              </button>
            );
          })}
        </div>
        <select 
          value={project}
          onChange={(e) => handleParamChange('project', e.target.value)}
          className="bg-zinc-900 border border-zinc-800 text-[10px] font-black uppercase tracking-widest text-zinc-400 rounded-xl px-3 py-2.5 max-w-[140px] focus:outline-none focus:border-zinc-700 transition-colors truncate"
        >
          <option value="all">TODOS PROJETOS</option>
          {projects.map((p) => (
            <option key={p.id} value={p.id}>{p.name}</option>
          ))}
        </select>
      </div>

      {active === 'custom' && (
        <div className="flex gap-2 animate-in fade-in slide-in-from-top-2 duration-200">
          <div className="flex-1 flex flex-col gap-1">
            <label className="text-[9px] font-bold text-zinc-500 uppercase tracking-widest px-1">De</label>
            <input 
              type="date" 
              value={from}
              onChange={(e) => handleParamChange('from', e.target.value)}
              className="w-full bg-zinc-900 border border-zinc-800 rounded-lg px-3 py-2 text-xs text-zinc-300 focus:outline-none focus:border-zinc-700 transition-colors"
            />
          </div>
          <div className="flex-1 flex flex-col gap-1">
            <label className="text-[9px] font-bold text-zinc-500 uppercase tracking-widest px-1">Até</label>
            <input 
              type="date" 
              value={to}
              onChange={(e) => handleParamChange('to', e.target.value)}
              className="w-full bg-zinc-900 border border-zinc-800 rounded-lg px-3 py-2 text-xs text-zinc-300 focus:outline-none focus:border-zinc-700 transition-colors"
            />
          </div>
        </div>
      )}
    </div>
  );
}
