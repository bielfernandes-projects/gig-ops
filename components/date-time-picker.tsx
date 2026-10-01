'use client';

import { useState } from 'react';
import { ChevronLeft, ChevronRight, Clock } from 'lucide-react';
import { fmtDate, fmtWeekday, toIso, wallClock, ymd } from '@/lib/time';
import { TimeDialModal } from './time-dial-modal';

interface DateTimePickerProps {
  /** Field name for the hidden input (form submission) */
  name: string;
  /** Label displayed above the picker */
  label: string;
  /** Initial ISO or datetime-local value */
  defaultValue?: string;
  /** Whether the field is required */
  required?: boolean;
  /** Fires with the ISO string whenever date or time changes */
  onChange?: (isoValue: string) => void;
}

const WEEKDAYS = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
const MONTHS = [
  'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
  'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro',
];

const pad2 = (n: number) => String(n).padStart(2, '0');

/**
 * The calendar grid works in plain year/month/day numbers, read off the Brazilian clock — never off
 * the browser's. A musician picking "20:00" from another timezone must store the same instant a
 * colleague at home would.
 */
function parseInitial(value?: string): { date: { year: number; month: number; day: number } | null; hour: string; minute: string } {
  if (!value) return { date: null, hour: '20', minute: '00' };
  // Handle both ISO (with Z/offset) and datetime-local formats
  const d = new Date(value.includes('T') ? value : value + 'T00:00:00');
  if (isNaN(d.getTime())) return { date: null, hour: '20', minute: '00' };
  const w = wallClock(d);
  return {
    date: { year: w.year, month: w.month, day: w.day },
    hour: pad2(w.hour),
    minute: pad2(w.minute),
  };
}

function getDaysInMonth(year: number, month: number): number {
  return new Date(year, month + 1, 0).getDate();
}

function getFirstDayOfWeek(year: number, month: number): number {
  return new Date(year, month, 1).getDay();
}

export function DateTimePicker({ name, label, defaultValue, required, onChange }: DateTimePickerProps) {
  const initial = parseInitial(defaultValue);
  const [todayYear, todayMonth, todayDay] = ymd();

  /** The picked day, as a plain Brazilian calendar date (month is 1-12). */
  const [selectedDate, setSelectedDate] = useState(initial.date);
  const [viewYear, setViewYear] = useState(initial.date?.year ?? todayYear);
  const [viewMonth, setViewMonth] = useState((initial.date?.month ?? todayMonth) - 1);
  const [hour, setHour] = useState(initial.hour);
  const [minute, setMinute] = useState(initial.minute);
  const [clockOpen, setClockOpen] = useState(false);

  const isoFor = (date: typeof selectedDate, h: string, m: string) =>
    date ? toIso(date.year, date.month, date.day, Number(h), Number(m)) : '';

  const emitChange = (date: typeof selectedDate, h: string, m: string) => {
    onChange?.(isoFor(date, h, m));
  };

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
    const d = { year: viewYear, month: viewMonth + 1, day };
    setSelectedDate(d);
    emitChange(d, hour, minute);
  };

  const isSelected = (day: number) =>
    selectedDate?.day === day && selectedDate?.month === viewMonth + 1 && selectedDate?.year === viewYear;

  const isToday = (day: number) => todayDay === day && todayMonth === viewMonth + 1 && todayYear === viewYear;

  // Build the hidden value: ISO String (Standard for DB)
  const hiddenValue = isoFor(selectedDate, hour, minute);

  // Selected weekday display — read off the same instant the form will submit.
  const selectedWeekday = hiddenValue ? fmtWeekday(hiddenValue) : null;

  return (
    <div className="flex flex-col gap-2">
      <label className="text-xs font-medium text-zinc-400">
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
            <span key={wd} className={`text-center text-xs font-medium text-zinc-500 ${wd === 'Sáb' || wd === 'Dom' ? 'text-zinc-600' : 'text-zinc-500'}`}>
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
            <span className="text-xs text-zinc-400">{fmtDate(hiddenValue)}</span>
          </div>
        )}
      </div>

      {/* Time: opens the round clock (any minute, dark theme) */}
      <button
        type="button"
        onClick={() => setClockOpen(true)}
        className="flex items-center justify-between gap-2 rounded-lg border border-zinc-800 bg-zinc-900 px-3 py-2 text-left transition-colors hover:border-zinc-700"
      >
        <span className="flex items-center gap-2 text-xs font-medium text-zinc-500">
          <Clock className="h-4 w-4" /> Horário
        </span>
        <span className="text-sm font-semibold tabular-nums text-zinc-100">{hour}:{minute}</span>
      </button>
      {clockOpen && (
        <TimeDialModal
          hour={Number(hour)}
          minute={Number(minute)}
          onCancel={() => setClockOpen(false)}
          onConfirm={(h, m) => {
            setHour(pad2(h));
            setMinute(pad2(m));
            setClockOpen(false);
            emitChange(selectedDate, pad2(h), pad2(m));
          }}
        />
      )}

      {/* Validation feedback */}
      {required && !selectedDate && (
        <p className="text-xs font-medium text-amber-500/80">Selecione uma data no calendário acima.</p>
      )}
    </div>
  );
}
