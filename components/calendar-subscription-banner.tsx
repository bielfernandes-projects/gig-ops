'use client';

import { useState } from 'react';
import { Calendar, Copy, Check, X } from 'lucide-react';
import { toast } from 'sonner';

type Props = {
  calendarToken: string | null;
};

export function CalendarSubscriptionBanner({ calendarToken }: Props) {
  const [dismissed, setDismissed] = useState(false);
  const [copied, setCopied] = useState(false);

  if (!calendarToken || dismissed) return null;

  const calendarUrl = `${typeof window !== 'undefined' ? window.location.origin : ''}/api/calendar/${calendarToken}`;

  const handleCopy = async () => {
    await navigator.clipboard.writeText(calendarUrl);
    setCopied(true);
    toast.success('Link de assinatura copiado!');
    setTimeout(() => setCopied(false), 3000);
  };

  return (
    <div className="bg-indigo-500/10 border border-indigo-500/20 rounded-xl p-4 mb-6 flex items-start gap-3">
      <Calendar className="w-5 h-5 text-indigo-400 shrink-0 mt-0.5" />
      <div className="flex-1 min-w-0">
        <p className="text-sm font-bold text-indigo-300 mb-1">
          Sincronize sua agenda automaticamente
        </p>
        <p className="text-xs text-zinc-400 mb-3">
          Copie o link abaixo e adicione no Google Agenda (<strong>Configurações &gt; Adicionar agenda &gt; Do URL</strong>). 
          Depois disso, novos shows aparecem automaticamente.
        </p>
        <div className="flex items-center gap-2">
          <input
            type="text"
            readOnly
            value={calendarUrl}
            className="flex-1 min-w-0 bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-2 text-[11px] text-zinc-400 font-mono focus:outline-none truncate"
          />
          <button
            onClick={handleCopy}
            className="flex items-center gap-1.5 bg-indigo-600 hover:bg-indigo-500 text-white font-bold px-3 py-2 rounded-lg text-xs transition-colors shrink-0"
          >
            {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
            {copied ? 'Copiado!' : 'Copiar'}
          </button>
        </div>
      </div>
      <button
        onClick={() => setDismissed(true)}
        className="p-1 text-zinc-600 hover:text-zinc-300 transition-colors shrink-0"
        title="Dispensar"
      >
        <X className="w-4 h-4" />
      </button>
    </div>
  );
}
