import assert from 'node:assert/strict';
import { cleanFee, cleanGigImport, endInstant, gigInstant, missingGigFields } from '../lib/gig-import-model.ts';
import { tidy } from '../lib/gemini.ts';

// the model's output is re-validated: impossible dates/times become null, rows with nothing usable are dropped
const { gigs } = cleanGigImport({
  gigs: [
    { title: ' Bar do Zé ', date: '2026-10-15', time: '21:00', endTime: '23:30', fee: 800.504, project: ' Brown ', location: ' ', notes: 'Trio' },
    { title: 'Casamento', date: '2026-02-30', time: '25:10', fee: -5 },
    { title: 'Sem data', date: 'sábado', time: '9:05', fee: 'mil' },
    { title: '  ', date: null },
    'lixo',
  ],
});
assert.equal(gigs.length, 3);
assert.deepEqual(gigs[0], { title: 'Bar do Zé', date: '2026-10-15', time: '21:00', endTime: '23:30', fee: 800.5, project: 'Brown', location: null, notes: 'Trio' });
assert.equal(gigs[1].date, null, '30 de fevereiro não existe');
assert.equal(gigs[1].time, null, '25:10 não é horário');
assert.equal(gigs[1].fee, null, 'cachê negativo é descartado');
assert.equal(gigs[2].date, null);
assert.equal(gigs[2].time, '09:05', 'hora de um dígito ganha zero à esquerda');
assert.equal(gigs[2].fee, null, 'cachê que não é número é descartado');
assert.equal(gigs[1].project, null, 'sem banda indicada');
assert.deepEqual(cleanGigImport(null).gigs, []);
assert.deepEqual(cleanGigImport({ gigs: 'x' }).gigs, []);

// what is still missing on a row
assert.deepEqual(missingGigFields({ title: 'A', date: '2026-10-15', time: '21:00' }), []);
assert.deepEqual(missingGigFields({ title: ' ', date: null, time: null }), ['title', 'date', 'time']);

// Brasília wall-clock time to an instant (UTC-3)
assert.equal(gigInstant('2026-10-15', '21:00'), '2026-10-16T00:00:00.000Z');
assert.equal(gigInstant('2026-10-15', '00:30'), '2026-10-15T03:30:00.000Z');

// end time: same day, or next day when it is not after the start
assert.equal(endInstant('2026-10-15', '21:00', '23:30'), '2026-10-16T02:30:00.000Z');
assert.equal(endInstant('2026-10-15', '22:00', '01:00'), '2026-10-16T04:00:00.000Z', 'passou da meia-noite');
assert.equal(gigs[1].endTime, null);

// the cachê as the IA most often answers it: the text of the cell, in Brazilian notation (dot = thousands, comma = cents)
const fees: [unknown, number | null][] = [
  [180, 180],
  ['400', 400],
  ['$400', 400],
  ['R$ 450', 450],
  ['Cachê: R$ 1.200,00', 1200],
  ['Cachê: R$ 150,00', 150], // a coluna de cachê como ela chega numa lista real colada na importação
  ['R$ 150,00', 150],
  ['cachê: R$1.500', 1500],
  ['800,50', 800.5],
  ['1.5k', 1500],
  ['1,5k', 1500],
  ['1.200', 1200],
  ['2.000.000', 2000000],
  ['', null],
  ['a combinar', null],
  ['-200', null],
  [null, null],
];
for (const [input, expected] of fees) assert.equal(cleanFee(input), expected, `cachê ${JSON.stringify(input)}`);
assert.equal(cleanGigImport({ gigs: [{ title: 'Casamento Marina', date: '2026-10-15', fee: 'R$ 1.200,00' }] }).gigs[0].fee, 1200);

// a list copied from a spreadsheet separates its columns with tabs: they have to survive, or the project collapses into the name
const tidied = tidy('Evento\tProjeto\tData\tHora\tCachê\nCasamento   Marina \t Trio Acústico\t15/10/2026\t21:00\tR$ 1.200,00');
assert.equal(tidied.split('\n')[1].split('\t').length, 5, 'as cinco colunas da linha sobrevivem ao tidy');
assert.ok(tidied.includes('Casamento Marina'), 'espaços repetidos dentro da célula ainda somem');
assert.ok(!tidied.includes('  '), 'nenhum espaço duplo sobra');

// lista colada em colunas com "|", na ordem data-primeiro: os separadores chegam inteiros à IA
const colada = tidy('24/05/2026 | 20:00 | Sunrise | Grupo Deixa em Off | Cachê: R$ 150,00');
assert.equal(colada, '24/05/2026 | 20:00 | Sunrise | Grupo Deixa em Off | Cachê: R$ 150,00', 'as barras e a linha ficam intactas');
assert.deepEqual(
  cleanGigImport({ gigs: [{ title: 'Sunrise', project: 'Grupo Deixa em Off', date: '2026-05-24', time: '20:00', fee: 'Cachê: R$ 150,00' }] }).gigs[0],
  { title: 'Sunrise', date: '2026-05-24', time: '20:00', endTime: null, fee: 150, project: 'Grupo Deixa em Off', location: null, notes: null },
);

console.log('check-gig-import: ok');
