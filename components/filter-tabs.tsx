'use client';

import { useRouter, useSearchParams } from 'next/navigation';

const FILTERS = [
  { key: '7days', label: '7 Dias' },
  { key: 'month', label: 'Este Mês' },
  { key: 'all', label: 'Completa' },
] as const;

export function FilterTabs() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const active = searchParams.get('tab') || '7days';

  const handleChange = (key: string) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set('tab', key);
    router.push(`/?${params.toString()}`);
  };

  return (
    <div className="flex gap-1.5 p-1 bg-zinc-900 border border-zinc-800 rounded-xl w-full select-none" role="tablist">
      {FILTERS.map(({ key, label }) => {
        const isActive = active === key;
        return (
          <button
            key={key}
            role="tab"
            aria-selected={isActive}
            onClick={() => handleChange(key)}
            className={`flex-1 py-2 px-3 text-xs font-bold tracking-wide rounded-lg transition-all ${
              isActive
                ? 'bg-zinc-100 text-zinc-950 shadow-sm'
                : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800'
            }`}
          >
            {label}
          </button>
        );
      })}
    </div>
  );
}
