'use client';

import { Copy, Check } from 'lucide-react';
import { useState } from 'react';
import { GigWithProject } from '@/lib/types';
import { fmtDate, fmtDuration, fmtTime } from '@/lib/time';

interface CopyLogisticsButtonProps {
  gig: GigWithProject;
}

const formatDuration = fmtDuration;

const formatTime = fmtTime;
const formatDate = fmtDate;

export function CopyLogisticsButton({ gig }: CopyLogisticsButtonProps) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    const startTime = formatTime(gig.start_time);
    const endTime = gig.end_time ? formatTime(gig.end_time) : null;
    const duration = gig.end_time ? formatDuration(gig.start_time, gig.end_time) : null;

    const timeStr = endTime
      ? `${startTime} às ${endTime}${duration ? ` (${duration})` : ''}`
      : startTime;

    const lines = [
      `📌 *${gig.title}*`,
      `📅 Data: ${formatDate(gig.start_time)}`,
      `⏰ Hora: ${timeStr}`,
      `📍 Endereço: ${gig.location}`,
    ];

    const text = lines.join('\n');

    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Fallback for older browsers / non-HTTPS
      const el = document.createElement('textarea');
      el.value = text;
      document.body.appendChild(el);
      el.select();
      document.execCommand('copy');
      document.body.removeChild(el);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <button
      onClick={handleCopy}
      title="Copiar logística para o WhatsApp"
      className={`p-2 min-w-[44px] min-h-[44px] flex items-center justify-center rounded-lg transition-all select-none ${
        copied
          ? 'text-emerald-400 bg-emerald-500/10'
          : 'text-zinc-500 hover:text-zinc-200 hover:bg-zinc-800'
      }`}
    >
      {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
    </button>
  );
}
