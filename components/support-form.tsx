'use client';

import { useState } from 'react';
import { Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { sendSupportMessage } from '@/app/actions/support-actions';

const field = 'w-full rounded-md border border-zinc-800 bg-zinc-900 px-3 py-2 text-sm text-zinc-100 placeholder-zinc-600 focus:border-emerald-500/50 focus:outline-none focus:ring-1 focus:ring-emerald-500/50';

export function SupportForm({ defaultEmail = '' }: { defaultEmail?: string }) {
  const [pending, setPending] = useState(false);
  const [sent, setSent] = useState(false);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setPending(true);
    const res = await sendSupportMessage(new FormData(e.currentTarget));
    setPending(false);
    if ('error' in res) toast.error(res.error);
    else setSent(true);
  }

  if (sent) {
    return (
      <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/10 p-5 text-sm text-emerald-200">
        <p className="font-semibold">Mensagem enviada!</p>
        <p className="mt-1 text-emerald-200/80">Respondemos no e-mail que você informou, normalmente em até 1 dia útil.</p>
      </div>
    );
  }

  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-4">
      {/* Honeypot: hidden from people and screen readers, bots fill it. */}
      <input type="text" name="website" tabIndex={-1} autoComplete="off" aria-hidden="true" className="hidden" />
      <div className="flex flex-col gap-1.5">
        <label htmlFor="support-name" className="text-xs font-medium text-zinc-400">Seu nome</label>
        <input id="support-name" name="name" required maxLength={100} className={field} />
      </div>
      <div className="flex flex-col gap-1.5">
        <label htmlFor="support-email" className="text-xs font-medium text-zinc-400">Seu e-mail (para a resposta)</label>
        <input id="support-email" name="email" type="email" required maxLength={200} defaultValue={defaultEmail} className={field} />
      </div>
      <div className="flex flex-col gap-1.5">
        <label htmlFor="support-message" className="text-xs font-medium text-zinc-400">Como podemos ajudar?</label>
        <textarea id="support-message" name="message" required minLength={10} maxLength={4000} rows={6} className={field} placeholder="Conte o que aconteceu e, se puder, em qual tela." />
      </div>
      <button
        type="submit"
        disabled={pending}
        className="flex items-center justify-center gap-2 rounded-md bg-zinc-100 py-2.5 font-bold text-zinc-950 transition-colors hover:bg-white disabled:opacity-70"
      >
        {pending ? <Loader2 className="h-5 w-5 animate-spin" /> : 'Enviar mensagem'}
      </button>
    </form>
  );
}
