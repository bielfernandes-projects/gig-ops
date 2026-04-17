'use client';

import { Copy, Check } from 'lucide-react';
import { useState } from 'react';
import { GigWithProject } from '@/lib/types';

interface CopyLogisticsButtonProps {
  gig: GigWithProject;
}

function formatDuration(startIso: string, endIso: string): string {
  const start = new Date(startIso);
  const end = new Date(endIso);
  const diffMs = end.getTime() - start.getTime();
  if (diffMs <= 0) return '';
  const totalMins = Math.floor(diffMs / 60000);
  const hours = Math.floor(totalMins / 60);
  const mins = totalMins % 60;
  if (hours > 0 && mins > 0) return `${hours}h${mins}m de show`;
  if (hours > 0) return `${hours}h de show`;
  return `${mins}m de show`;
}

function formatTime(iso: string): string {
  return new Date(iso).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', timeZone: 'America/Sao_Paulo' });
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric', timeZone: 'America/Sao_Paulo' });
}

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
      className={`p-1.5 rounded-lg transition-all select-none ${
        copied
          ? 'text-emerald-400 bg-emerald-500/10'
          : 'text-zinc-500 hover:text-zinc-200 hover:bg-zinc-800'
      }`}
    >
      {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
    </button>
  );
}
