import Link from 'next/link';

export const metadata = { title: 'Termos de uso — Gigueiros' };

export default function Termos() {
  return (
    <div className="fixed inset-0 z-[999] overflow-y-auto bg-zinc-950 text-zinc-300">
      <main className="mx-auto max-w-2xl space-y-4 px-5 py-12 text-sm leading-relaxed">
        <Link href="/" className="text-emerald-400">← Voltar</Link>
        <h1 className="text-2xl font-bold text-zinc-100">Termos de uso</h1>
        <p>O Gigueiros é um aplicativo para organizar agenda, escala e cachês de bandas e projetos musicais.</p>
        <h2 className="font-semibold text-zinc-100">Conta e responsabilidade</h2>
        <p>Você é responsável pelas informações que cadastra e por manter sua senha em segurança. O administrador da banda decide quem entra e o que cada músico pode ver.</p>
        <h2 className="font-semibold text-zinc-100">Teste e cobrança</h2>
        <p>Toda banda tem 7 dias de teste grátis, sem cartão. Depois, o uso continua mediante assinatura por banda, paga por cartão de crédito e processada pelo Stripe: mensal (R$ 49,90) ou anual (R$ 499,00, cobrado de uma vez). As 50 primeiras bandas a assinar têm o preço de Fundador (R$ 24,90 por mês), mantido para elas. A assinatura renova automaticamente até ser cancelada. Sem pagamento após o teste, o acesso pode ser suspenso; os dados são mantidos por 30 dias e podem ser exportados a pedido.</p>
        <h2 className="font-semibold text-zinc-100">Disponibilidade</h2>
        <p>Buscamos manter o serviço no ar, mas ele é fornecido no estado em que se encontra, sem garantia de disponibilidade contínua. Os valores calculados no app são apoio de gestão e não substituem contabilidade.</p>
        <h2 className="font-semibold text-zinc-100">Cancelamento</h2>
        <p>Você pode cancelar a qualquer momento em Perfil → Gerenciar assinatura. O acesso segue até o fim do período já pago e não há nova cobrança depois disso. Você também pode pedir a exclusão dos seus dados.</p>
        <h2 className="font-semibold text-zinc-100">Reembolso</h2>
        <p>Em até 7 dias após a primeira cobrança, você pode pedir o reembolso integral pelo e-mail contato@gigueiros.com.br. Fora desse prazo, não há reembolso proporcional do período já pago.</p>
        <p className="text-zinc-500">Última atualização: setembro de 2026.</p>
      </main>
    </div>
  );
}
