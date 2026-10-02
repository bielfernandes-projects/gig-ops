// Shared by the imports that read a document with Gemini (repertoire, gig list): file -> text, and the JSON call
// with its model fallback chain. Server only.

export type ImportFile = { name: string; mime: string; bytes: Uint8Array };

// Order = capacity first, not strength: the person reviews and fixes the result on screen anyway, so what matters is
// the import going through. Each model has its own free daily quota. Measured 2026-09: `3.1-flash-lite` took 55+ requests
// with no limit, while the "flash" ones stop at 20/day. The stronger ones stay as the last resort.
const FALLBACK_MODELS = ['gemini-3.1-flash-lite', 'gemini-3.5-flash-lite', 'gemini-3.5-flash', 'gemini-3.7-flash', 'gemini-3.6-flash', 'gemini-3.8-flash'];

export const IMPORT_MAX_BYTES = 4 * 1024 * 1024;

/** How long one model gets to answer before the chain moves on. The route itself allows 300s for the whole import. */
const ATTEMPT_TIMEOUT_MS = 75_000;

/**
 * Total budget for the whole chain. Without it, 6 models that each time out add up well past the route's 300s and the
 * person watches "Lendo a lista..." forever before anything at all comes back.
 */
const CHAIN_BUDGET_MS = 180_000;

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
  /** Models to try, in order, before the shared fallback chain. For a caller whose input needs more reading than copying. */
  models?: string[];
  /** Sampling temperature. Default 0.2 — never 0: see the note on `temperature` below. */
  temperature?: number;
}): Promise<unknown> {
  const body = JSON.stringify({
    systemInstruction: { parts: [{ text: opts.instructions }] },
    contents: [{ role: 'user', parts: [{ text: opts.text }] }],
    generationConfig: {
      responseMimeType: 'application/json',
      responseSchema: opts.schema,
      // NÃO volte para 0. Com temperatura 0 a decodificação é puramente gulosa e entra em laço de repetição: medido em
      // homologação (2026-10-02), o `gemini-3.5-flash` escreveu `"time": "20:0020:00:00Z"` — "20:00" repetido — e
      // encerrou o JSON ali mesmo, com finishReason STOP e 67 tokens, perdendo cachê, projeto e todas as gigs seguintes.
      // Era esta a causa de "só vem título e data". Um pouco de temperatura quebra o laço sem inventar dado.
      temperature: opts.temperature ?? 0.2,
      // Extracting a list needs no long "thinking"; without this the 3.x models take ~90s on a 200-song document.
      // `medium` was tried on the gig list (2026-10-01) and made it worse, not better: the thinking ate the answer
      // budget, so rows came back nearly empty and one run was truncated mid-JSON. Reading power comes from the model
      // in `models`, not from thinking harder.
      thinkingConfig: { thinkingLevel: 'low' },
    },
  });
  // No timeout here meant a model that stopped answering left the person staring at "Lendo a lista..." until the route's
  // 300s ran out. Each attempt now gives up on its own and the chain moves to the next model.
  const call = (model: string) =>
    fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-goog-api-key': opts.apiKey },
      body,
      signal: AbortSignal.timeout(ATTEMPT_TIMEOUT_MS),
    }).catch((e: unknown) => {
      console.error(`${opts.label}: ${model} did not answer`, e);
      return null; // same treatment as a 503: try the next model
    });

  // Google retires model names for new accounts without notice, and the free tier answers 429 (quota) or
  // 503 (busy) per model. So: the configured model first (GEMINI_MODEL), then the others, one after another.
  const chain = [...new Set([opts.model, ...(opts.models ?? []), ...FALLBACK_MODELS].filter((m): m is string => Boolean(m)))];
  let res: Response | null = null;
  let dailyQuota = 0; // models that answered 429 because their DAILY quota is gone (a wait of minutes won't help)
  let silent = 0; // models that timed out or failed to connect
  let tried = 0;
  const deadline = Date.now() + CHAIN_BUDGET_MS;
  for (const model of chain) {
    if (Date.now() > deadline) {
      console.error(`${opts.label}: out of time after ${chain.indexOf(model)} models`);
      break;
    }
    tried++;
    res = await call(model);
    if (!res || res.status === 503) {
      await new Promise((r) => setTimeout(r, 2000));
      res = await call(model);
    }
    if (!res) {
      silent++;
      continue;
    }
    if (res.status === 429 && /PerDay/i.test(await res.clone().text())) dailyQuota++;
    if (res.ok || ![404, 429, 503].includes(res.status)) break;
  }
  if (!res && silent > 0) throw new ImportError('O serviço de leitura demorou demais para responder. Tente de novo em alguns minutos.');

  // `tried`, not `chain.length`: the loop can stop early (budget spent, a model that never answered), and then "every
  // model is out of quota for today" would be a lie.
  if (res?.status === 429 && dailyQuota === tried) {
    throw new ImportError('A cota gratuita diária da leitura por IA acabou por hoje. Tente de novo amanhã.');
  }
  if (res?.status === 429) throw new ImportError('O serviço de leitura está no limite de uso agora. Tente de novo em alguns minutos.');
  if (res?.status === 503) throw new ImportError('O serviço de leitura está sobrecarregado agora. Tente de novo em alguns minutos.');
  if (res && !res.ok) console.error(`${opts.label}: Gemini error`, res.status, (await res.text()).slice(0, 500));
  if (!res || !res.ok) throw new ImportError(`Não foi possível ler o documento (erro ${res?.status ?? 'desconhecido'}).`);

  const data = (await res.json()) as {
    candidates?: { content?: { parts?: { text?: string }[] }; finishReason?: string }[];
    promptFeedback?: { blockReason?: string };
    usageMetadata?: Record<string, number>;
  };
  const candidate = data.candidates?.[0];
  const out = candidate?.content?.parts?.map((p) => p.text ?? '').join('') ?? '';


  // Why the answer is unusable matters: each reason needs a different move from the person, and the old code turned all
  // of them into "veio incompleta" with nothing in the logs.
  const reason = candidate?.finishReason;
  if (reason === 'MAX_TOKENS') {
    console.error(`${opts.label}: answer truncated`, data.usageMetadata);
    throw new ImportError('A lista é longa demais para uma leitura só e a resposta foi cortada. Divida em partes (por exemplo um mês por vez) e importe cada uma.');
  }
  if (data.promptFeedback?.blockReason || reason === 'SAFETY' || reason === 'PROHIBITED_CONTENT') {
    console.error(`${opts.label}: blocked`, data.promptFeedback?.blockReason ?? reason);
    throw new ImportError('O serviço de leitura recusou esse conteúdo. Tire dados pessoais da lista e tente de novo.');
  }
  if (!out.trim()) {
    console.error(`${opts.label}: empty answer`, reason, data.usageMetadata);
    throw new ImportError('A leitura voltou vazia. Tente de novo.');
  }
  try {
    return JSON.parse(out);
  } catch {
    console.error(`${opts.label}: answer is not JSON`, reason, `...${out.slice(-200)}`);
    throw new ImportError('A leitura do documento veio incompleta. Tente de novo.');
  }
}
