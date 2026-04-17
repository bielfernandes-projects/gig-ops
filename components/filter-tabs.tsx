'use client';

import { useRouter, useSearchParams } from 'next/navigation';

const FILTERS = [
  { key: '7days', label: '7 Dias' },
  { key: 'month', label: 'Este Mês' },
  { key: 'all', label: 'Completa' },
  { key: 'custom', label: 'Personalizado' },
] as const;

export function FilterTabs() {
  const router = useRouter();
  const searchParams = useSearchParams();
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
    router.push(`/?${params.toString()}`);
  };

  const handleDateChange = (type: 'from' | 'to', value: string) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set(type, value);
    router.push(`/?${params.toString()}`);
  };

  return (
    <div className="flex flex-col gap-3">
      <div className="flex gap-1.5 p-1 bg-zinc-900 border border-zinc-800 rounded-xl w-full select-none" role="tablist">
        {FILTERS.map(({ key, label }) => {
          const isActive = active === key;
          return (
            <button
              key={key}
              role="tab"
              aria-selected={isActive}
              onClick={() => handleChange(key)}
              className={`flex-1 py-1.5 px-2 text-[10px] font-black uppercase tracking-wider rounded-lg transition-all ${
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

      {active === 'custom' && (
        <div className="flex gap-2 animate-in fade-in slide-in-from-top-2 duration-200">
          <div className="flex-1 flex flex-col gap-1">
            <label className="text-[9px] font-bold text-zinc-500 uppercase tracking-widest px-1">De</label>
            <input 
              type="date" 
              value={from}
              onChange={(e) => handleDateChange('from', e.target.value)}
              className="w-full bg-zinc-900 border border-zinc-800 rounded-lg px-3 py-2 text-xs text-zinc-300 focus:outline-none focus:border-zinc-700 transition-colors"
            />
          </div>
          <div className="flex-1 flex flex-col gap-1">
            <label className="text-[9px] font-bold text-zinc-500 uppercase tracking-widest px-1">Até</label>
            <input 
              type="date" 
              value={to}
              onChange={(e) => handleDateChange('to', e.target.value)}
              className="w-full bg-zinc-900 border border-zinc-800 rounded-lg px-3 py-2 text-xs text-zinc-300 focus:outline-none focus:border-zinc-700 transition-colors"
            />
          </div>
        </div>
      )}
    </div>
  );
}
