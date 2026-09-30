import { cleanImportResult, type ImportResult } from '@/lib/import-model';
import { generateJson, ImportError, IMPORT_MAX_BYTES, textOf, tidy, type ImportFile } from '@/lib/gemini';

export * from '@/lib/import-model';

// ─── the IA call ─────────────────────────────────────────────────────────────

const INSTRUCTIONS = `Você lê repertórios musicais de bandas brasileiras (pagode, samba, MPB, axé, pop...) e devolve as músicas organizadas em blocos.

O documento pode ser uma tabela, uma lista com marcadores, texto corrido ou uma planilha exportada, com muito ruído (linhas vazias, cabeçalhos de página, várias versões da mesma lista no mesmo arquivo). Extraia TODAS as músicas, na ordem em que aparecem.

BLOCOS
- Um bloco é um agrupamento nomeado: "Bloco 01 - Valeu em C", "SAMBA ROMANTICO", "Set 2 Pagodes", "Cria de Terreiro", um título em linha própria seguido de músicas. Use o nome como está escrito, sem inventar.
- Se o documento não tem agrupamentos, devolva um único bloco com name null.
- Músicas antes do primeiro título entram num bloco com name null.

CADA MÚSICA
- title: só o nome da música. Sem tom, sem marcador ("•", "P -", "R -"), sem trecho de letra entre parênteses, sem o artista. Se o nome estiver todo em MAIÚSCULAS, converta para o formato normal ("SONHOS E PLANOS" → "Sonhos e Planos").
- artist: SOMENTE se o documento escreve o artista/compositor junto da música (ex.: "Penetra - Zeca", "Falso Herói - Fundo de Quintal"). Escreva como está no documento, sem expandir abreviações e sem completar com o seu conhecimento. Rótulos que não são artista (ex.: "Ponto", "Refrão", "Solo") NÃO vão em artist. Na dúvida, null.
- key: o tom exatamente como escrito no documento (ex.: "F#", "Bb", "Am", "GM"). Se não houver, null. NUNCA deduza o tom pelo que você sabe da música.
- lyricHint: o primeiro verso, quando o documento traz (coluna "Início", texto entre parênteses que é letra). Senão null.
- note: observações de execução (solo, transição, crescente, só refrão, cai meio tom, sequência de acordes, marcadores soltos como "P" ou "R"). Senão null.
- Se uma linha junta várias músicas claramente separadas, separe.
- NÃO são músicas: sequências de acordes soltas (ex.: "Am7 - Em (3x) Am7 - D"), instruções sem nome de música (ex.: "(Original)", "Palmas + Diretão", "Só viola largando de G7M", "bye bye - cai meio tom") e falas de palco. Se estiverem logo abaixo de uma música, coloque em note dela; se estiverem sozinhas, ignore.

REGRAS
- Nunca invente nada. Campo ausente é null.
- Não elimine repetidas: se a mesma música aparece duas vezes, devolva as duas.
- Ignore linhas vazias, números de página, cabeçalhos de coluna ("Música | Tom | Início") e tabelas sem conteúdo.`;

const RESPONSE_SCHEMA = {
  type: 'OBJECT',
  properties: {
    blocks: {
      type: 'ARRAY',
      items: {
        type: 'OBJECT',
        properties: {
          name: { type: 'STRING', nullable: true },
          songs: {
            type: 'ARRAY',
            items: {
              type: 'OBJECT',
              properties: {
                title: { type: 'STRING' },
                artist: { type: 'STRING', nullable: true },
                key: { type: 'STRING', nullable: true },
                lyricHint: { type: 'STRING', nullable: true },
                note: { type: 'STRING', nullable: true },
              },
              required: ['title'],
            },
          },
        },
        required: ['songs'],
      },
    },
  },
  required: ['blocks'],
};

export type { ImportFile } from '@/lib/gemini';
export { ImportError, IMPORT_MAX_BYTES } from '@/lib/gemini';

/**
 * Reads a repertoire document with Gemini and returns its songs grouped in blocks. The file is turned
 * into text first (PDF, DOCX and TXT alike), which also lets us refuse scanned PDFs early.
 */
export async function parseRepertoire(file: ImportFile, opts: { apiKey: string; model?: string }): Promise<ImportResult> {
  if (file.bytes.byteLength > IMPORT_MAX_BYTES) throw new ImportError('Arquivo grande demais (máximo 4 MB).');
  const parsed = await generateJson({ ...opts, instructions: INSTRUCTIONS, schema: RESPONSE_SCHEMA, text: tidy(await textOf(file)), label: 'repertoire import' });
  return cleanImportResult(parsed);
}
