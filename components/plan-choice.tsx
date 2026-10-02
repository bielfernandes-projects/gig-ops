'use client';

import { KIND_LABEL, type BandKind } from '@/lib/plans';

const OPTIONS: { kind: BandKind; hint: string; no?: string }[] = [
  { kind: 'banda', hint: 'Tenho uma banda: escalo músicos e controlo cachês e despesas da equipe.' },
  { kind: 'freela', hint: 'Toco como freelancer: controlo minhas gigs e o que cada banda me deve.', no: 'Sem equipe nem escala.' },
];

/** The two account types, as radio cards. Used by the sign-up form and the first-run onboarding. */
export function PlanChoice({ value, onChange }: { value: BandKind; onChange: (kind: BandKind) => void }) {
  return (
    <fieldset className="flex flex-col gap-2">
      <legend className="mb-1 text-xs font-medium text-zinc-400">Como você vai usar o app?</legend>
      <div className="grid grid-cols-2 gap-2">
        {OPTIONS.map((o) => (
          <label
            key={o.kind}
            className={`flex cursor-pointer flex-col gap-1 rounded-lg border p-2.5 text-left transition-colors ${value === o.kind ? 'border-emerald-500/60 bg-emerald-500/10' : 'border-zinc-800 bg-zinc-950 hover:border-zinc-700'}`}
          >
            <input type="radio" name="kind" value={o.kind} checked={value === o.kind} onChange={() => onChange(o.kind)} className="sr-only" />
            <span className="text-sm font-bold text-zinc-100">{KIND_LABEL[o.kind]}</span>
            <span className="text-[11px] leading-snug text-zinc-400">{o.hint}</span>
            {o.no && <span className="text-[11px] font-semibold leading-snug text-zinc-500">{o.no}</span>}
          </label>
        ))}
      </div>
      {value === 'freela' && <p className="text-[11px] leading-snug text-zinc-500">Dá para subir para uma conta Banda depois, sem perder suas gigs.</p>}
    </fieldset>
  );
}
