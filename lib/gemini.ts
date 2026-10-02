// Shared by the imports that read a document with Gemini (repertoire, gig list): file -> text, and the JSON call
// with its model fallback chain. Server only.

export type ImportFile = { name: string; mime: string; bytes: Uint8Array };

// Order = capacity first, not strength: the person reviews and fixes the result on screen anyway, so what matters is
// the import going through. Each model has its own free daily quota. Measured 2026-09: `3.1-flash-lite` took 55+ requests
// with no limit, while the "flash" ones stop at 20/day. The stronger ones stay as the last resort.
const FALLBACK_MODELS = ['gemini-3.1-flash-lite', 'gemini-3.5-flash-lite', 'gemini-3.5-flash', 'gemini-3.7-flash', 'gemini-3.6-flash', 'gemini-3.8-flash'];

export const IMPORT_MAX_BYTES = 4 * 1024 * 1024;

/** Error whose message is safe to show to the person. */
export class ImportError extends Error {}

/** Readable text of the file. Scanned PDFs (an image, no text layer) are out of scope and say so. */
export async function textOf(file: ImportFile): Promise<string> {
  const name = file.name.toLowerCase();
  if (name.endsWith('.txt') || name.endsWith('.csv') || file.mime === 'text/plain' || file.mime === 'text/csv') return new TextDecoder().decode(file.bytes);
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
  if (name.endsWith('.xlsx') || name.endsWith('.xls') || name.endsWith('.ods') || name.endsWith('.numbers')) {
    throw new ImportError('Ainda não leio planilhas direto. Abra a planilha, copie as células e cole no campo "Colar texto" — ou salve como CSV e envie de novo.');
  }
  if (/\.(png|jpe?g|webp|heic|gif)$/.test(name) || file.mime.startsWith('image/')) {
    throw new ImportError('Ainda não leio imagens nem prints. Cole o texto da lista no campo "Colar texto", ou envie um PDF com texto, DOCX, TXT ou CSV.');
  }
  throw new ImportError('Formato não suportado. Envie um PDF com texto, DOCX, TXT ou CSV — ou cole a lista no campo "Colar texto".');
}

/**
 * Collapses the whitespace noise of a document before it goes to the IA. Tabs survive on purpose: a list copied from
 * Excel or Google Planilhas separates its columns with tabs, and squashing them into spaces turned
 * "Nome<TAB>Projeto<TAB>15/10" into one blurry phrase — the IA then folded the project into the name and lost the fee.
 */
export const tidy = (text: string) =>
  text
    .replace(/\r\n?/g, '\n')
    .replace(/[^\S\n\t]+/g, ' ')
    .replace(/ *\t */g, '\t')
    .replace(/\n{3,}/g, '\n\n');

/**
 * Asks Gemini to read `text` following `instructions` and answer as JSON matching `schema`. The text goes in as
 * plain text (sending the PDF itself was slower and hit "overloaded" errors far more often on the free tier).
 * `label` only names the flow in server logs.
 */
export async function generateJson(opts: {
  apiKey: string;
  model?: string;
  instructions: string;
  schema: unknown;
  text: string;
  label: string;
  /** How hard the model may think. `low` is enough to copy rows out of a table; a gig list written in free-form prose needs `medium`. */
  thinkingLevel?: 'low' | 'medium' | 'high';
}): Promise<unknown> {
  const body = JSON.stringify({
    systemInstruction: { parts: [{ text: opts.instructions }] },
    contents: [{ role: 'user', parts: [{ text: opts.text }] }],
    generationConfig: {
      responseMimeType: 'application/json',
      responseSchema: opts.schema,
      temperature: 0,
      // Copying a list out of a table needs no long "thinking"; without a cap the 3.x models take ~90s on a 200-song
      // document. A caller whose input is messier (a gig list written however the band leader felt like) raises it.
      thinkingConfig: { thinkingLevel: opts.thinkingLevel ?? 'low' },
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
  let dailyQuota = 0; // models that answered 429 because their DAILY quota is gone (a wait of minutes won't help)
  for (const model of chain) {
    res = await call(model);
    if (res.status === 503) {
      await new Promise((r) => setTimeout(r, 2000));
      res = await call(model);
    }
    if (res.status === 429 && /PerDay/i.test(await res.clone().text())) dailyQuota++;
    if (res.ok || ![404, 429, 503].includes(res.status)) break;
  }

  if (res?.status === 429 && dailyQuota === chain.length) {
    throw new ImportError('A cota gratuita diária da leitura por IA acabou por hoje. Tente de novo amanhã.');
  }
  if (res?.status === 429) throw new ImportError('O serviço de leitura está no limite de uso agora. Tente de novo em alguns minutos.');
  if (res?.status === 503) throw new ImportError('O serviço de leitura está sobrecarregado agora. Tente de novo em alguns minutos.');
  if (res && !res.ok) console.error(`${opts.label}: Gemini error`, res.status, (await res.text()).slice(0, 500));
  if (!res || !res.ok) throw new ImportError(`Não foi possível ler o documento (erro ${res?.status ?? 'desconhecido'}).`);

  const data = (await res.json()) as { candidates?: { content?: { parts?: { text?: string }[] } }[] };
  const out = data.candidates?.[0]?.content?.parts?.map((p) => p.text ?? '').join('') ?? '';
  try {
    return JSON.parse(out);
  } catch {
    throw new ImportError('A leitura do documento veio incompleta. Tente de novo.');
  }
}
