'use client';

import { useState, useTransition } from 'react';
import { toggleSoundPayment } from '@/app/actions/gig-actions';
import { Check } from 'lucide-react';
import { toast } from 'sonner';

export function ToggleSoundPaymentButton({ 
  gigId, 
  currentStatus,
  role
}: { 
  gigId: string; 
  currentStatus: boolean;
  role?: string;
}) {
  const [isPending, startTransition] = useTransition();
  const [isPaid, setIsPaid] = useState(currentStatus);

  const handleToggle = () => {
    if (role === 'viewer') return;
    
    const newStatus = !isPaid;
    setIsPaid(newStatus);
    
    startTransition(async () => {
      const res = await toggleSoundPayment(gigId, newStatus);
      
      if (res?.error) {
        setIsPaid(isPaid);
        toast.error(`Erro: ${res.error}`);
      } else {
        toast.success(newStatus ? 'Equipamento pago!' : 'Pagamento de som pendente');
      }
    });
  };

  return (
    <button
      onClick={handleToggle}
      disabled={isPending || role === 'viewer'}
      className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-amber-500 focus:ring-offset-2 focus:ring-offset-zinc-900 ${
        isPaid ? 'bg-emerald-500' : 'bg-zinc-700'
      } ${(isPending || role === 'viewer') ? 'opacity-70 cursor-not-allowed' : 'cursor-pointer hover:bg-opacity-80'}`}
      role="switch"
      aria-checked={isPaid}
    >
      <span className="sr-only">Status de Pagamento do Som</span>
      <span
        className={`inline-flex items-center justify-center size-4 transform rounded-full bg-white transition-transform ${
          isPaid ? 'translate-x-6' : 'translate-x-1'
        }`}
      >
         {isPaid && <Check className="w-2.5 h-2.5 text-emerald-600 stroke-[3]" />}
      </span>
    </button>
  );
}
