import assert from 'node:assert/strict';
import { cleanGigImport, endInstant, gigInstant, missingGigFields } from '../lib/gig-import-model.ts';

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

console.log('check-gig-import: ok');
