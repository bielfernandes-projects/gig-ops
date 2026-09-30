import { cleanGigImport, type GigImportResult } from '@/lib/gig-import-model';
import { generateJson, ImportError, IMPORT_MAX_BYTES, textOf, tidy, type ImportFile } from '@/lib/gemini';
import { dayKey } from '@/lib/time';

export * from '@/lib/gig-import-model';

const instructions = (today: string) => `Você lê listas de gigs (shows) de músicos e bandas brasileiras e devolve cada gig com data, horário, nome e cachê.

A lista pode ser uma planilha exportada ou copiada (colunas separadas por tabulação ou ponto e vírgula), uma tabela, texto corrido, mensagens de WhatsApp ou uma agenda em tópicos, com ruído (cabeçalhos, linhas vazias, totais). Extraia TODAS as gigs, na ordem em que aparecem.

Hoje é ${today} (AAAA-MM-DD).

EXEMPLO (lista de um músico freelancer, com o mês em títulos como "JANEIRO" e o ano no cabeçalho "Festas do ano de 2026"):
"03/01-Cala Playa(Brown)-12:00/$180" vira title "Cala Playa", project "Brown", date "2026-01-03", time "12:00", fee 180.
"10/01-Barraca Winn(Isaacão)13:00/$200" vira title "Barraca Winn", project "Isaacão", date "2026-01-10", time "13:00", fee 200.
Títulos de mês e de ano NÃO são gigs: use-os para completar as datas.

CADA GIG
- title: o nome da gig como está escrito (evento, casa, local, contratante), SEM a parte da banda/projeto (veja project). Se só houver o local, use o local. Não invente.
- date: AAAA-MM-DD. Datas brasileiras vêm como dia/mês ("15/10", "15/10/26", "sáb 15 de outubro"). Sem ano escrito: use o ano de hoje, a menos que o documento mostre outro ano (título, cabeçalho, outras linhas). Se a data estiver ilegível ou ausente: null.
- time: horário de início em HH:MM, 24h ("21h" vira "21:00", "20h30" vira "20:30", "9 da noite" vira "21:00"). Se houver faixa ("20h às 23h"), time é só o início. Se não houver horário: null.
- endTime: horário de término em HH:MM, 24h, SOMENTE se a lista o informa (faixa "20h às 23h", "21:00-00:30", "até 1h"). Se não houver: null. Não calcule nem deduza a duração.
- fee: o cachê em reais como número, sem símbolo ("$400" vira 400, "R$ 1.500,00" vira 1500, "800,50" vira 800.5, "1.5k" vira 1500). Se não houver valor: null. Não some nem calcule.
- project: a banda ou projeto pelo qual o músico foi contratado, quando a lista indica. Costuma vir entre parênteses, colchetes ou depois de um traço junto do nome da gig. Escreva como está. Se não houver: null.
- location: cidade, endereço ou nome do local, SOMENTE se estiver escrito e não for o próprio title. Senão null.
- notes: outras informações úteis da linha (contratante, formato, observações). Senão null.

REGRAS
- Nunca invente nada. Campo ausente é null.
- Não elimine repetidas: se a mesma gig aparece duas vezes, devolva as duas.
- Ignore cabeçalhos de coluna, linhas de total e linhas vazias.`;

const RESPONSE_SCHEMA = {
  type: 'OBJECT',
  properties: {
    gigs: {
      type: 'ARRAY',
      items: {
        type: 'OBJECT',
        properties: {
          title: { type: 'STRING' },
          date: { type: 'STRING', nullable: true },
          time: { type: 'STRING', nullable: true },
          endTime: { type: 'STRING', nullable: true },
          fee: { type: 'NUMBER', nullable: true },
          project: { type: 'STRING', nullable: true },
          location: { type: 'STRING', nullable: true },
          notes: { type: 'STRING', nullable: true },
        },
        required: ['title'],
      },
    },
  },
  required: ['gigs'],
};

/** Reads a gig list (a file, or text the person pasted) with Gemini. Nothing is saved here: the person reviews it on screen first. */
export async function parseGigs(input: { file: ImportFile } | { text: string }, opts: { apiKey: string; model?: string }): Promise<GigImportResult> {
  let text: string;
  if ('file' in input) {
    if (input.file.bytes.byteLength > IMPORT_MAX_BYTES) throw new ImportError('Arquivo grande demais (máximo 4 MB).');
    text = await textOf(input.file);
  } else {
    text = input.text;
  }
  const parsed = await generateJson({ ...opts, instructions: instructions(dayKey()), schema: RESPONSE_SCHEMA, text: tidy(text), label: 'gig import' });
  return cleanGigImport(parsed);
}
