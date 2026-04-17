'use client';

import { useState } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';

interface DateTimePickerProps {
  /** Field name for the hidden input (form submission) */
  name: string;
  /** Label displayed above the picker */
  label: string;
  /** Initial ISO or datetime-local value */
  defaultValue?: string;
  /** Whether the field is required */
  required?: boolean;
}

const WEEKDAYS = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
const MONTHS = [
  'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
  'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro',
];

function parseInitial(value?: string): { date: Date | null; hour: string; minute: string } {
  if (!value) return { date: null, hour: '20', minute: '00' };
  // Handle both ISO (with Z/offset) and datetime-local formats
  const d = new Date(value.includes('T') ? value : value + 'T00:00:00');
  if (isNaN(d.getTime())) return { date: null, hour: '20', minute: '00' };
  return {
    date: d,
    hour: String(d.getHours()).padStart(2, '0'),
    minute: String(d.getMinutes()).padStart(2, '0'),
  };
}

function getDaysInMonth(year: number, month: number): number {
  return new Date(year, month + 1, 0).getDate();
}

function getFirstDayOfWeek(year: number, month: number): number {
  return new Date(year, month, 1).getDay();
}

export function DateTimePicker({ name, label, defaultValue, required }: DateTimePickerProps) {
  const initial = parseInitial(defaultValue);
  const today = new Date();

  const [selectedDate, setSelectedDate] = useState<Date | null>(initial.date);
  const [viewYear, setViewYear] = useState(initial.date?.getFullYear() ?? today.getFullYear());
  const [viewMonth, setViewMonth] = useState(initial.date?.getMonth() ?? today.getMonth());
  const [hour, setHour] = useState(initial.hour);
  const [minute, setMinute] = useState(initial.minute);

  const daysInMonth = getDaysInMonth(viewYear, viewMonth);
  const firstDay = getFirstDayOfWeek(viewYear, viewMonth);

  const prevMonth = () => {
    if (viewMonth === 0) { setViewMonth(11); setViewYear(y => y - 1); }
    else setViewMonth(m => m - 1);
  };

  const nextMonth = () => {
    if (viewMonth === 11) { setViewMonth(0); setViewYear(y => y + 1); }
    else setViewMonth(m => m + 1);
  };

  const selectDay = (day: number) => {
    setSelectedDate(new Date(viewYear, viewMonth, day));
  };

  const isSelected = (day: number) =>
    selectedDate?.getDate() === day &&
    selectedDate?.getMonth() === viewMonth &&
    selectedDate?.getFullYear() === viewYear;

  const isToday = (day: number) =>
    today.getDate() === day &&
    today.getMonth() === viewMonth &&
    today.getFullYear() === viewYear;

  // Build the hidden value: ISO String (Standard for DB)
  const hiddenValue = selectedDate
    ? new Date(selectedDate.getFullYear(), selectedDate.getMonth(), selectedDate.getDate(), Number(hour), Number(minute)).toISOString()
    : '';

  // Selected weekday display
  const selectedWeekday = selectedDate
    ? selectedDate.toLocaleDateString('pt-BR', { weekday: 'long', timeZone: 'America/Sao_Paulo' })
    : null;

  return (
    <div className="flex flex-col gap-2">
      <label className="text-xs font-semibold text-zinc-400 uppercase tracking-widest">
        {label}
      </label>

      {/* Hidden input for form submission */}
      <input type="hidden" name={name} value={hiddenValue} />

      {/* Calendar grid */}
      <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-3">
        {/* Month navigation */}
        <div className="flex items-center justify-between mb-3">
          <button type="button" onClick={prevMonth} className="p-1.5 rounded-lg text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800 transition-colors">
            <ChevronLeft className="w-4 h-4" />
          </button>
          <span className="text-sm font-bold text-zinc-200 tracking-wide">
            {MONTHS[viewMonth]} {viewYear}
          </span>
          <button type="button" onClick={nextMonth} className="p-1.5 rounded-lg text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800 transition-colors">
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>

        {/* Weekday headers */}
        <div className="grid grid-cols-7 mb-1">
          {WEEKDAYS.map(wd => (
            <span key={wd} className={`text-center text-[10px] font-bold uppercase tracking-wider py-1 ${wd === 'Sáb' || wd === 'Dom' ? 'text-zinc-600' : 'text-zinc-500'}`}>
              {wd}
            </span>
          ))}
        </div>

        {/* Day grid */}
        <div className="grid grid-cols-7 gap-0.5">
          {/* Empty slots for offset */}
          {Array.from({ length: firstDay }).map((_, i) => (
            <div key={`empty-${i}`} />
          ))}

          {Array.from({ length: daysInMonth }).map((_, i) => {
            const day = i + 1;
            const d = new Date(viewYear, viewMonth, day);
            const dayOfWeek = d.getDay();
            const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;

            return (
              <button
                key={day}
                type="button"
                onClick={() => selectDay(day)}
                className={`aspect-square flex items-center justify-center rounded-lg text-sm font-medium transition-all relative
                  ${isSelected(day)
                    ? 'bg-emerald-500 text-zinc-950 font-bold shadow-lg shadow-emerald-500/20'
                    : isToday(day)
                    ? 'bg-zinc-800 text-zinc-100 ring-1 ring-zinc-600'
                    : isWeekend
                    ? 'text-zinc-600 hover:bg-zinc-800/50 hover:text-zinc-400'
                    : 'text-zinc-300 hover:bg-zinc-800 hover:text-zinc-100'
                  }
                `}
              >
                {day}
              </button>
            );
          })}
        </div>

        {/* Selected date display */}
        {selectedDate && selectedWeekday && (
          <div className="mt-3 pt-3 border-t border-zinc-800/80 text-center">
            <span className="text-xs font-bold text-emerald-400 capitalize">{selectedWeekday}</span>
            <span className="text-xs text-zinc-500 mx-1">•</span>
            <span className="text-xs text-zinc-400">
              {selectedDate.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric', timeZone: 'America/Sao_Paulo' })}
            </span>
          </div>
        )}
      </div>

      {/* Time selectors */}
      <div className="flex items-center gap-2">
        <div className="flex-1 flex items-center gap-1.5 bg-zinc-900 border border-zinc-800 rounded-lg px-3 py-2">
          <span className="text-[10px] text-zinc-500 font-bold uppercase tracking-widest shrink-0">Hora</span>
          <select
            value={hour}
            onChange={e => setHour(e.target.value)}
            className="flex-1 bg-transparent text-sm text-zinc-100 font-medium focus:outline-none appearance-none text-center"
          >
            {Array.from({ length: 24 }).map((_, h) => (
              <option key={h} value={String(h).padStart(2, '0')}>
                {String(h).padStart(2, '0')}
              </option>
            ))}
          </select>
          <span className="text-zinc-500 font-bold">:</span>
          <select
            value={minute}
            onChange={e => setMinute(e.target.value)}
            className="flex-1 bg-transparent text-sm text-zinc-100 font-medium focus:outline-none appearance-none text-center"
          >
            {['00', '15', '30', '45'].map(m => (
              <option key={m} value={m}>{m}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Validation feedback */}
      {required && !selectedDate && (
        <p className="text-[10px] text-amber-500/80 font-medium">Selecione uma data no calendário acima.</p>
      )}
    </div>
  );
}
