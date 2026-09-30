import Link from 'next/link';
import { FAQ } from '@/lib/faq';
import { getUserInfo } from '@/lib/auth';
import { SupportForm } from '@/components/support-form';

export const metadata = {
  title: 'Ajuda e suporte — Gigueiros',
  description: 'Perguntas frequentes sobre o Gigueiros e formulário para falar com a gente.',
};

export default async function Suporte() {
  const info = await getUserInfo();

  return (
    <div className="fixed inset-0 z-[999] overflow-y-auto bg-zinc-950 text-zinc-300">
      <main className="mx-auto max-w-2xl space-y-10 px-5 py-12 text-sm leading-relaxed">
        <div className="space-y-3">
          <Link href={info.userId ? '/dashboard' : '/'} className="text-emerald-400">← Voltar</Link>
          <h1 className="text-2xl font-bold text-zinc-100">Ajuda e suporte</h1>
          <p>Veja as respostas mais comuns abaixo. Não achou o que procurava? Mande uma mensagem no final da página.</p>
        </div>

        {FAQ.map((section) => (
          <section key={section.title} className="space-y-2">
            <h2 className="font-semibold text-zinc-100">{section.title}</h2>
            <div className="divide-y divide-zinc-800 rounded-xl border border-zinc-800 bg-zinc-900/40">
              {section.items.map((item) => (
                <details key={item.q} className="group px-4 py-3">
                  <summary className="cursor-pointer list-none font-medium text-zinc-200 marker:hidden [&::-webkit-details-marker]:hidden">
                    <span className="mr-2 inline-block text-emerald-400 transition-transform group-open:rotate-90">›</span>
                    {item.q}
                  </summary>
                  <p className="mt-2 pl-5 text-zinc-400">{item.a}</p>
                </details>
              ))}
            </div>
          </section>
        ))}

        <section className="space-y-4" id="contato">
          <h2 className="font-semibold text-zinc-100">Falar com a gente</h2>
          <SupportForm defaultEmail={info.email ?? ''} />
        </section>
      </main>
    </div>
  );
}
