'use client';

import { useState } from 'react';
import { PenLine, Check, X } from 'lucide-react';

type Props = {
  label: string;
  value: string | null;
  placeholder: string;
  maxLength: number;
  /** Returns an error message, or nothing on success. */
  onSave: (value: string) => Promise<string | void>;
  /** Without this the line is read-only (no pencil). */
  editable?: boolean;
};

/** "Label  Value ✎": the pencil swaps the value for a small inline field. */
export function EditableLine({ label, value, placeholder, maxLength, onSave, editable = true }: Props) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(value ?? '');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const save = async () => {
    setBusy(true);
    const err = await onSave(draft);
    setBusy(false);
    if (err) setError(err);
    else {
      setError('');
      setEditing(false);
    }
  };

  return (
    <div className="flex min-h-9 items-center gap-3 text-left">
      <span className="w-14 shrink-0 text-xs font-medium text-zinc-500">{label}</span>
      {editing ? (
        <form
          className="flex min-w-0 flex-1 items-center gap-1"
          onSubmit={(e) => {
            e.preventDefault();
            save();
          }}
        >
          <input
            autoFocus
            value={draft}
            maxLength={maxLength}
            placeholder={placeholder}
            aria-label={label}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => e.key === 'Escape' && setEditing(false)}
            className="min-w-0 flex-1 border-b border-zinc-600 bg-transparent py-1 text-sm text-zinc-100 placeholder-zinc-600 focus:border-zinc-300 focus:outline-none"
          />
          <button type="submit" disabled={busy} aria-label="Salvar" className="p-1.5 text-zinc-300 hover:text-white disabled:opacity-50">
            <Check className="h-4 w-4" />
          </button>
          <button type="button" aria-label="Cancelar" onClick={() => setEditing(false)} className="p-1.5 text-zinc-500 hover:text-zinc-300">
            <X className="h-4 w-4" />
          </button>
        </form>
      ) : (
        <>
          <span className={`min-w-0 flex-1 truncate text-sm ${value ? 'font-semibold text-zinc-100' : 'text-zinc-600'}`}>{value || placeholder}</span>
          {editable && (
            <button
              type="button"
              aria-label={`Editar ${label.toLowerCase()}`}
              onClick={() => {
                setDraft(value ?? '');
                setError('');
                setEditing(true);
              }}
              className="p-1.5 text-zinc-500 hover:text-zinc-200"
            >
              <PenLine className="h-4 w-4" />
            </button>
          )}
        </>
      )}
      {error && <span className="text-xs text-red-400">{error}</span>}
    </div>
  );
}
