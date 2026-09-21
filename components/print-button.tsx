'use client';

export function PrintButton() {
  return (
    <button
      type="button"
      onClick={() => window.print()}
      className="rounded-lg bg-zinc-100 px-5 py-2.5 text-sm font-bold text-zinc-900 hover:bg-white"
    >
      Imprimir ou salvar em PDF
    </button>
  );
}
