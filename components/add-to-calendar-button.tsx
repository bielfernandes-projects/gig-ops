'use client';

import { useState, useRef, useEffect } from 'react';
import { Calendar, Download, ExternalLink, ChevronDown } from 'lucide-react';
import { createEvents, type EventAttributes, type DateArray } from 'ics';

type Props = {
  title: string;
  projectName?: string;
  start_time: string;
  end_time: string | null;
  location: string;
  className?: string;
  compact?: boolean;
  fullWidth?: boolean;
};

function toLocalArray(iso: string): DateArray {
  const d = new Date(iso);
  return [
    d.getFullYear(),
    d.getMonth() + 1,
    d.getDate(),
    d.getHours(),
    d.getMinutes(),
  ] as DateArray;
}

function downloadIcs(content: string, filename: string) {
  const blob = new Blob([content], { type: 'text/calendar;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

function buildGoogleCalendarUrl(props: {
  title: string;
  projectName?: string;
  start_time: string;
  end_time: string | null;
  location: string;
}) {
  const fullTitle = props.projectName
    ? `${props.title} [${props.projectName}]`
    : props.title;

  const startDate = new Date(props.start_time);
  const endDate = props.end_time
    ? new Date(props.end_time)
    : new Date(startDate.getTime() + 3 * 60 * 60 * 1000);

  const toGcalDate = (d: Date) =>
    d.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '');

  const params = new URLSearchParams({
    action: 'TEMPLATE',
    text: fullTitle,
    dates: `${toGcalDate(startDate)}/${toGcalDate(endDate)}`,
    details: '',
    ctz: 'America/Sao_Paulo',
  });

  if (props.location && props.location !== 'A definir') {
    params.set('location', props.location);
  }

  return `https://calendar.google.com/calendar/render?${params.toString()}`;
}

export function AddToCalendarButton({ title, projectName, start_time, end_time, location, className = '', compact = false, fullWidth = false }: Props) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const fullTitle = projectName ? `${title} [${projectName}]` : title;

  const handleDownloadIcs = () => {
    const startArr = toLocalArray(start_time);
    const endDate = end_time
      ? new Date(end_time)
      : new Date(new Date(start_time).getTime() + 3 * 60 * 60 * 1000);
    const endArr: DateArray = [
      endDate.getFullYear(),
      endDate.getMonth() + 1,
      endDate.getDate(),
      endDate.getHours(),
      endDate.getMinutes(),
    ];

    const event: EventAttributes = {
      title: fullTitle,
      start: startArr,
      end: endArr,
      startInputType: 'local',
      startOutputType: 'local',
    };

    if (location && location !== 'A definir') {
      event.location = location;
    }

    const { value, error } = createEvents([event]);
    if (!error && value) {
      const safeName = title.replace(/[^a-zA-Z0-9]/g, '_').slice(0, 40);
      downloadIcs(value, `${safeName}.ics`);
    }
    setOpen(false);
  };

  const handleGoogleCalendar = () => {
    setOpen(false);
  };

  const googleCalendarUrl = buildGoogleCalendarUrl({ title, projectName, start_time, end_time, location });

  return (
    <div ref={ref} className={`relative ${fullWidth ? 'flex' : 'inline-flex'} ${className}`}>
      <button
        onClick={() => setOpen(!open)}
        className={`flex items-center justify-center gap-1.5 font-bold rounded-lg transition-colors ${
          compact
            ? 'p-2 bg-indigo-500/15 text-indigo-400 hover:bg-indigo-500/25 hover:text-indigo-300 border border-indigo-500/20'
            : fullWidth
            ? 'w-full px-4 py-3 bg-indigo-600 hover:bg-indigo-500 text-white text-sm shadow-md'
            : 'px-4 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white text-sm shadow-md'
        }`}
        title="Adicionar ao calendário"
      >
        <Calendar className={compact ? 'w-[18px] h-[18px]' : 'w-4 h-4'} />
        {!compact && <span>{fullWidth ? 'Adicionar ao Calendário' : 'Calendário'}</span>}
        {!compact && <ChevronDown className={`w-3.5 h-3.5 transition-transform ${open ? 'rotate-180' : ''}`} />}
      </button>

      {open && (
        <div className={`absolute top-full ${fullWidth ? 'left-0 right-0' : 'right-0'} mt-2 ${fullWidth ? 'w-full' : 'w-56'} bg-zinc-900 border border-zinc-800 rounded-xl shadow-2xl z-50 overflow-hidden animate-in fade-in slide-in-from-top-1 duration-150`}>
          <div className="p-1.5">
            <button
              onClick={handleDownloadIcs}
              className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-zinc-300 hover:bg-zinc-800 hover:text-zinc-50 transition-colors text-left"
            >
              <Download className="w-4 h-4 text-emerald-400 shrink-0" />
              <div className="flex flex-col">
                <span>Baixar arquivo .ics</span>
                <span className="text-[10px] text-zinc-500 font-normal">Para importar em qualquer app</span>
              </div>
            </button>

            <a
              href={googleCalendarUrl}
              target="_blank"
              rel="noopener,noreferrer"
              onClick={handleGoogleCalendar}
              className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-zinc-300 hover:bg-zinc-800 hover:text-zinc-50 transition-colors text-left"
            >
              <ExternalLink className="w-4 h-4 text-blue-400 shrink-0" />
              <div className="flex flex-col">
                <span>Abrir no Google Calendar</span>
                <span className="text-[10px] text-zinc-500 font-normal">Adiciona direto na sua agenda</span>
              </div>
            </a>
          </div>
        </div>
      )}
    </div>
  );
}
