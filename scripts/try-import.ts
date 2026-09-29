// Manual check (needs network + GEMINI_API_KEY; not part of `npm test`). Reads the files in a folder and
// prints what the import would create. Writes NOTHING to the database.
// Usage: GEMINI_API_KEY=... node scripts/try-import.ts docs/repertorios-exemplo [outdir]
import { readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { missingFields, parseRepertoire } from '../lib/repertoire-import.ts';

const [dir, outDir] = process.argv.slice(2);
const apiKey = process.env.GEMINI_API_KEY;
if (!dir || !apiKey) {
  console.error('Uso: GEMINI_API_KEY=... node scripts/try-import.ts <pasta> [pasta-de-saida]');
  process.exit(1);
}

let first = true;
for (const name of readdirSync(dir)) {
  if (!first) await new Promise((r) => setTimeout(r, 8000)); // free tier: be gentle with requests per minute
  first = false;
  const bytes = readFileSync(join(dir, name));
  const t0 = Date.now();
  try {
    const result = await parseRepertoire({ name, mime: '', bytes }, { apiKey, model: process.env.GEMINI_MODEL });
    const songs = result.blocks.flatMap((b) => b.songs);
    const noKey = songs.filter((s) => missingFields(s).includes('key')).length;
    const noArtist = songs.filter((s) => missingFields(s).includes('artist')).length;
    console.log(`\n=== ${name}  (${((Date.now() - t0) / 1000).toFixed(1)}s)`);
    console.log(`${result.blocks.length} blocos, ${songs.length} músicas | sem tom: ${noKey} | sem artista: ${noArtist}`);
    for (const b of result.blocks) console.log(`  [${b.name ?? '(sem nome)'}] ${b.songs.length}: ${b.songs.slice(0, 4).map((s) => `${s.title}${s.key ? ' ' + s.key : ''}${s.artist ? ' / ' + s.artist : ''}`).join(' · ')}${b.songs.length > 4 ? ' …' : ''}`);
    if (outDir) writeFileSync(join(outDir, `${name}.json`), JSON.stringify(result, null, 1));
  } catch (e) {
    console.log(`\n=== ${name}: ERRO ${(e as Error).message}`);
  }
}
