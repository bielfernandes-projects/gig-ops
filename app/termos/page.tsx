import Link from 'next/link';
import { CONTACT_EMAIL } from '@/lib/contact';

export const metadata = { title: 'Termos de uso — Gigueiros' };

export default function Termos() {
  return (
    <div className="fixed inset-0 z-[999] overflow-y-auto bg-zinc-950 text-zinc-300">
      <main className="mx-auto max-w-2xl space-y-4 px-5 py-12 text-sm leading-relaxed">
        <Link href="/" className="text-emerald-400">← Voltar</Link>
        <h1 className="text-2xl font-bold text-zinc-100">Termos de uso</h1>
        <p>O Gigueiros é um aplicativo para organizar agenda, escala, cachês e repertório de bandas e projetos musicais. É oferecido por Gabriel Fernandes, pessoa física. Contato: <a href={`mailto:${CONTACT_EMAIL}`} className="text-emerald-400">{CONTACT_EMAIL}</a>.</p>

        <h2 className="font-semibold text-zinc-100">Conta e responsabilidade</h2>
        <p>Você é responsável pelas informações que cadastra e por manter sua senha em segurança. O dono da banda decide quem entra e o que cada músico pode ver. Não use o app para fins ilegais nem para prejudicar outras pessoas ou o serviço.</p>

        <h2 className="font-semibold text-zinc-100">Teste e cobrança</h2>
        <p>Toda banda tem 7 dias de teste grátis, sem cartão. Depois, o uso continua mediante assinatura por banda, paga por cartão de crédito e processada pelo Stripe: mensal (R$ 49,90) ou anual (R$ 499,00, cobrado de uma vez). As 50 primeiras bandas a assinar têm o preço de Fundador (R$ 24,90 por mês), mantido enquanto a assinatura seguir ativa; se ela for cancelada, o preço de Fundador se perde. A assinatura renova automaticamente até ser cancelada. Os preços podem mudar, mas só valem para renovações futuras e avisamos com antecedência.</p>
        <p>Sem pagamento após o teste, ou se uma renovação falhar, a banda passa a modo somente leitura: os dados continuam salvos e visíveis, mas não podem ser editados até a assinatura voltar. Os dados são mantidos por 30 dias nessa situação e podem ser exportados a pedido.</p>

        <h2 className="font-semibold text-zinc-100">Cancelamento</h2>
        <p>Você pode cancelar a qualquer momento em Perfil → Gerenciar assinatura. O acesso segue até o fim do período já pago e não há nova cobrança depois disso. Você também pode pedir a exclusão da sua conta e dos seus dados.</p>

        <h2 className="font-semibold text-zinc-100">Reembolso</h2>
        <p>Em até 7 dias após a primeira cobrança, você pode pedir o reembolso integral pelo e-mail {CONTACT_EMAIL}. Fora desse prazo, não há reembolso proporcional do período já pago. O reembolso devolve o valor e encerra a assinatura.</p>

        <h2 className="font-semibold text-zinc-100">Conteúdo que você cadastra</h2>
        <p>Os dados, textos, cifras, letras, links e PDFs que você coloca no app são de sua responsabilidade: use apenas material que você tem direito de usar. O Gigueiros não fornece cifras nem letras; guarda o que você e sua banda cadastram. Se você é titular de direitos e acredita que algum conteúdo foi cadastrado indevidamente, escreva para {CONTACT_EMAIL} e o material será analisado e removido quando cabível.</p>

        <h2 className="font-semibold text-zinc-100">Disponibilidade</h2>
        <p>Buscamos manter o serviço no ar, mas ele é fornecido no estado em que se encontra, sem garantia de disponibilidade contínua. Os valores calculados no app são apoio de gestão e não substituem contabilidade. Faça suas próprias cópias de informações críticas, como contratos e comprovantes.</p>

        <h2 className="font-semibold text-zinc-100">Alterações e lei aplicável</h2>
        <p>Podemos atualizar estes termos; mudanças relevantes serão avisadas no app ou por e-mail. Estes termos seguem a lei brasileira, e o foro é o do seu domicílio, conforme o Código de Defesa do Consumidor. O tratamento de dados pessoais está descrito na <Link href="/privacidade" className="text-emerald-400">política de privacidade</Link>.</p>

        <p className="text-zinc-500">Última atualização: 28 de setembro de 2026.</p>
      </main>
    </div>
  );
}
