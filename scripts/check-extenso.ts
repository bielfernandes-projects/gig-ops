import assert from 'node:assert/strict';
import { reaisPorExtenso } from '../lib/extenso.ts';

const cases: [number, string][] = [
  [0, 'zero reais'],
  [1, 'um real'],
  [2, 'dois reais'],
  [15, 'quinze reais'],
  [21, 'vinte e um reais'],
  [100, 'cem reais'],
  [101, 'cento e um reais'],
  [350, 'trezentos e cinquenta reais'],
  [1000, 'mil reais'],
  [1001, 'mil e um reais'],
  [1100, 'mil e cem reais'],
  [1250.5, 'mil duzentos e cinquenta reais e cinquenta centavos'],
  [2000, 'dois mil reais'],
  [21000, 'vinte e um mil reais'],
  [123456.78, 'cento e vinte e três mil quatrocentos e cinquenta e seis reais e setenta e oito centavos'],
  [0.5, 'cinquenta centavos'],
  [0.01, 'um centavo'],
  [3.01, 'três reais e um centavo'],
];

for (const [value, expected] of cases) assert.equal(reaisPorExtenso(value), expected, String(value));
assert.equal(reaisPorExtenso(1_000_000), '');

console.log('extenso: all assertions passed');
