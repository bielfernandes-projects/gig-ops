const UNITS = ['zero', 'um', 'dois', 'três', 'quatro', 'cinco', 'seis', 'sete', 'oito', 'nove', 'dez', 'onze', 'doze', 'treze', 'quatorze', 'quinze', 'dezesseis', 'dezessete', 'dezoito', 'dezenove'];
const TENS = ['', '', 'vinte', 'trinta', 'quarenta', 'cinquenta', 'sessenta', 'setenta', 'oitenta', 'noventa'];
const HUNDREDS = ['', 'cento', 'duzentos', 'trezentos', 'quatrocentos', 'quinhentos', 'seiscentos', 'setecentos', 'oitocentos', 'novecentos'];

/** 0..999 in words. */
function below1000(n: number): string {
  if (n === 0) return '';
  if (n === 100) return 'cem';
  const h = Math.floor(n / 100);
  const rest = n % 100;
  const parts: string[] = [];
  if (h) parts.push(HUNDREDS[h]);
  if (rest) {
    if (rest < 20) parts.push(UNITS[rest]);
    else {
      const t = Math.floor(rest / 10);
      const u = rest % 10;
      parts.push(u ? `${TENS[t]} e ${UNITS[u]}` : TENS[t]);
    }
  }
  return parts.join(' e ');
}

function integerInWords(n: number): string {
  if (n === 0) return 'zero';
  const thousands = Math.floor(n / 1000);
  const rest = n % 1000;

  const head = thousands === 0 ? '' : thousands === 1 ? 'mil' : `${below1000(thousands)} mil`;
  const tail = below1000(rest);
  if (!head) return tail;
  if (!tail) return head;
  // "mil e cem", "mil e cinquenta", but "mil duzentos e trinta"
  return rest < 100 || rest % 100 === 0 ? `${head} e ${tail}` : `${head} ${tail}`;
}

/** Amount in reais written out in Portuguese, e.g. 1250.5 -> "mil duzentos e cinquenta reais e cinquenta centavos". Up to 999.999,99. */
export function reaisPorExtenso(value: number): string {
  const cents = Math.round(Math.abs(value) * 100);
  const reais = Math.floor(cents / 100);
  const centavos = cents % 100;
  if (reais > 999_999) return '';

  const reaisText = reais === 1 ? 'um real' : `${integerInWords(reais)} reais`;
  const centsText = centavos === 1 ? 'um centavo' : `${integerInWords(centavos)} centavos`;

  if (reais === 0 && centavos === 0) return 'zero reais';
  if (reais === 0) return centsText;
  return centavos === 0 ? reaisText : `${reaisText} e ${centsText}`;
}
