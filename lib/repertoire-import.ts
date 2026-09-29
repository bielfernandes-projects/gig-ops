import { cleanImportResult, type ImportResult } from '@/lib/import-model';

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

export type ImportFile = { name: string; mime: string; bytes: Uint8Array };

const FALLBACK_MODELS = ['gemini-3.5-flash', 'gemini-3.7-flash', 'gemini-3.8-flash'];

export const IMPORT_MAX_BYTES = 4 * 1024 * 1024;

/** Error whose message is safe to show to the person. */
export class ImportError extends Error {}

/** Readable text of the file. Scanned PDFs (an image, no text layer) are out of scope and say so. */
async function textOf(file: ImportFile): Promise<string> {
  const name = file.name.toLowerCase();
  if (name.endsWith('.txt') || file.mime === 'text/plain') return new TextDecoder().decode(file.bytes);
  if (name.endsWith('.docx')) {
    const mammoth = await import('mammoth');
    const { value } = await mammoth.extractRawText({ buffer: Buffer.from(file.bytes) });
    return value;
  }
  if (name.endsWith('.pdf') || file.mime === 'application/pdf') {
    const { extractText, getDocumentProxy } = await import('unpdf');
    const { text } = await extractText(await getDocumentProxy(new Uint8Array(file.bytes)), { mergePages: true });
    if (text.trim().length < 40) {
      throw new ImportError('Este PDF parece ser uma imagem (escaneado) e não tem texto para ler. Envie um PDF com texto selecionável, um DOCX ou um TXT.');
    }
    return text;
  }
  throw new ImportError('Formato não suportado. Envie um PDF, DOCX ou TXT.');
}

/**
 * Reads a repertoire document with Gemini and returns its songs grouped in blocks. The file is turned
 * into text first (PDF, DOCX and TXT alike): sending the PDF itself was slower and hit "overloaded"
 * errors far more often on the free tier, and extracting the text lets us refuse scanned PDFs early.
 */
export async function parseRepertoire(file: ImportFile, opts: { apiKey: string; model?: string }): Promise<ImportResult> {
  if (file.bytes.byteLength > IMPORT_MAX_BYTES) throw new ImportError('Arquivo grande demais (máximo 4 MB).');

  const parts = [{ text: (await textOf(file)).replace(/[ \t]+/g, ' ').replace(/\n{3,}/g, '\n\n') }];

  const body = JSON.stringify({
    systemInstruction: { parts: [{ text: INSTRUCTIONS }] },
    contents: [{ role: 'user', parts }],
    generationConfig: {
      responseMimeType: 'application/json',
      responseSchema: RESPONSE_SCHEMA,
      temperature: 0,
      // Extracting a list needs no long "thinking"; without this the 3.x models take ~90s on a 200-song document.
      thinkingConfig: { thinkingLevel: 'low' },
    },
  });
  const call = (model: string) =>
    fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-goog-api-key': opts.apiKey },
      body,
    });

  // Google retires model names for new accounts without notice, and the free tier answers 429 (quota) or
  // 503 (busy) per model. So: the configured model first (GEMINI_MODEL), then the others, one after another.
  const chain = [...new Set([opts.model, ...FALLBACK_MODELS].filter((m): m is string => Boolean(m)))];
  let res: Response | null = null;
  for (const model of chain) {
    res = await call(model);
    if (res.status === 503) {
      await new Promise((r) => setTimeout(r, 2000));
      res = await call(model);
    }
    if (res.ok || ![404, 429, 503].includes(res.status)) break;
  }

  if (res?.status === 429) throw new ImportError('O serviço de leitura está no limite de uso agora. Tente de novo em alguns minutos.');
  if (res?.status === 503) throw new ImportError('O serviço de leitura está sobrecarregado agora. Tente de novo em alguns minutos.');
  if (res && !res.ok) console.error('repertoire import: Gemini error', res.status, (await res.text()).slice(0, 500));
  if (!res || !res.ok) throw new ImportError(`Não foi possível ler o documento (erro ${res?.status ?? 'desconhecido'}).`);

  const data = (await res.json()) as { candidates?: { content?: { parts?: { text?: string }[] } }[] };
  const out = data.candidates?.[0]?.content?.parts?.map((p) => p.text ?? '').join('') ?? '';
  let parsed: unknown;
  try {
    parsed = JSON.parse(out);
  } catch {
    throw new ImportError('A leitura do documento veio incompleta. Tente de novo.');
  }
  return cleanImportResult(parsed);
}
