import Link from 'next/link';

export const metadata = { title: 'Privacidade — Minha Banda' };

export default function Privacidade() {
  return (
    <div className="fixed inset-0 z-[999] overflow-y-auto bg-zinc-950 text-zinc-300">
      <main className="mx-auto max-w-2xl space-y-4 px-5 py-12 text-sm leading-relaxed">
        <Link href="/" className="text-emerald-400">← Voltar</Link>
        <h1 className="text-2xl font-bold text-zinc-100">Política de privacidade</h1>
        <h2 className="font-semibold text-zinc-100">Dados que coletamos</h2>
        <p>E-mail e senha (criptografada) da conta; dados que você cadastra (shows, locais, músicos, telefone e e-mail de músicos, cachês); e, se você ativar, o identificador do seu dispositivo para notificações push.</p>
        <h2 className="font-semibold text-zinc-100">Para que usamos</h2>
        <p>Apenas para o funcionamento do app: exibir a agenda, calcular valores e enviar avisos. Não vendemos nem compartilhamos seus dados com terceiros para publicidade.</p>
        <h2 className="font-semibold text-zinc-100">Quem vê o quê</h2>
        <p>Os dados de uma banda ficam isolados das demais. O músico convidado vê os shows em que está escalado, sem os cachês dos colegas nem observações contratuais.</p>
        <h2 className="font-semibold text-zinc-100">Onde ficam</h2>
        <p>Os dados ficam em provedores de infraestrutura (Supabase e Vercel). Links de calendário (.ics) são privados: quem tem o link vê a agenda, então não os compartilhe.</p>
        <h2 className="font-semibold text-zinc-100">Seus direitos (LGPD)</h2>
        <p>Você pode pedir acesso, correção ou exclusão dos seus dados a qualquer momento, falando com o responsável pelo app.</p>
        <p className="text-zinc-500">Última atualização: setembro de 2026.</p>
      </main>
    </div>
  );
}
