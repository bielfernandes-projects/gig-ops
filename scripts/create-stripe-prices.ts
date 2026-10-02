/**
 * Cria no Stripe os preços do plano Freela e das adesões (ver DOCUMENTATION.md, "Planos e preços").
 * Idempotente: cada preço tem uma `lookup_key`; se já existe, só é listado. Imprime as variáveis de
 * ambiente a preencher (ids de preço não são segredo). Uso:
 *   node --env-file=.env --env-file=.env.local scripts/create-stripe-prices.ts
 */
import Stripe from 'stripe';

const key = process.env.STRIPE_SECRET_KEY;
if (!key) throw new Error('STRIPE_SECRET_KEY não configurada.');
const stripe = new Stripe(key);

// O produto da Banda é o dos preços que já existem; o Freela ganha um produto próprio.
const bandaProduct = (await stripe.prices.retrieve(process.env.STRIPE_PRICE_MONTHLY!)).product as string;
const found = (await stripe.products.search({ query: "name:'Gigueiros Freela'" })).data[0];
const freelaProduct = found?.id ?? (await stripe.products.create({ name: 'Gigueiros Freela', description: 'Conta Freela: gigs, projetos e cachês de quem toca para várias bandas.' })).id;

const WANTED = [
  { env: 'STRIPE_PRICE_FREELA', lookup: 'gg_freela_monthly', product: freelaProduct, cents: 1490, interval: 'month' },
  { env: 'STRIPE_PRICE_FREELA_ANNUAL', lookup: 'gg_freela_annual', product: freelaProduct, cents: 14900, interval: 'year' },
  { env: 'STRIPE_PRICE_ADESAO_BANDA', lookup: 'gg_adesao_banda_monthly', product: bandaProduct, cents: 2990, interval: 'month' },
  { env: 'STRIPE_PRICE_ADESAO_BANDA_ANNUAL', lookup: 'gg_adesao_banda_annual', product: bandaProduct, cents: 29900, interval: 'year' },
  { env: 'STRIPE_PRICE_ADESAO_FREELA', lookup: 'gg_adesao_freela_monthly', product: freelaProduct, cents: 990, interval: 'month' },
  { env: 'STRIPE_PRICE_ADESAO_FREELA_ANNUAL', lookup: 'gg_adesao_freela_annual', product: freelaProduct, cents: 9900, interval: 'year' },
] as const;

for (const w of WANTED) {
  const [existing] = (await stripe.prices.list({ lookup_keys: [w.lookup], limit: 1 })).data;
  const price = existing ?? (await stripe.prices.create({ product: w.product, currency: 'brl', unit_amount: w.cents, recurring: { interval: w.interval }, lookup_key: w.lookup, nickname: w.lookup }));
  console.log(`${w.env}=${price.id}${existing ? '  (já existia)' : '  (criado)'}`);
}
