import { cleanGigImport, type GigImportResult } from '@/lib/gig-import-model';
import { generateJson, ImportError, IMPORT_MAX_BYTES, textOf, tidy, type ImportFile } from '@/lib/gemini';
import { dayKey } from '@/lib/time';

export * from '@/lib/gig-import-model';

const instructions = (today: string) => `Você lê listas de gigs (shows) de músicos e bandas brasileiras e devolve cada gig com data, horário, nome e cachê.

A lista pode ser uma planilha exportada ou copiada (colunas separadas por tabulação, "|", ponto e vírgula ou vírgula), uma tabela, texto corrido, mensagens de WhatsApp ou uma agenda em tópicos, com ruído (cabeçalhos, linhas vazias, totais). Extraia TODAS as gigs, na ordem em que aparecem, e preencha TODOS os campos que a linha informa — principalmente project e fee, que são os que mais se perdem.

Hoje é ${today} (AAAA-MM-DD).

EXEMPLO 1 — lista corrida de um músico freelancer, com o mês em títulos como "JANEIRO" e o ano no cabeçalho "Festas do ano de 2026":
"03/01-Cala Playa(Brown)-12:00/$180" vira title "Cala Playa", project "Brown", date "2026-01-03", time "12:00", fee 180.
"10/01-Barraca Winn(Isaacão)13:00/$200" vira title "Barraca Winn", project "Isaacão", date "2026-01-10", time "13:00", fee 200.
Títulos de mês e de ano NÃO são gigs: use-os para completar as datas.

EXEMPLO 2 — lista em COLUNAS (separadas por "|", tabulação, ponto e vírgula ou vírgula). Cada coluna é um campo diferente: nunca junte duas colunas no title.
A ORDEM DAS COLUNAS VARIA de lista para lista. Descubra cada coluna pelo conteúdo, não pela posição: a que tem dia/mês é a date, a que tem hora é o time, a que tem "R$"/"cachê" é o fee. Sobram duas colunas de texto: a do lugar/evento é o title e a do nome da banda/grupo é o project (nomes com "Grupo", "Banda", "Trio", "Projeto", "Duo" são project).
"Casamento Marina | Trio Acústico | 15/10/2026 | 21:00 | Cachê: R$ 1.200,00" vira title "Casamento Marina", project "Trio Acústico", date "2026-10-15", time "21:00", fee 1200.
"24/05/2026 | 20:00 | Sunrise | Grupo Deixa em Off | Cachê: R$ 150,00" vira title "Sunrise", project "Grupo Deixa em Off", date "2026-05-24", time "20:00", fee 150. (A data vem primeiro aqui, e mesmo assim todos os campos são preenchidos.)
"Bar do Zé | Banda Sol | 18/10 | 22h às 1h | R$ 450" vira title "Bar do Zé", project "Banda Sol", date "2026-10-18", time "22:00", endTime "01:00", fee 450.
A primeira linha pode ser o cabeçalho das colunas ("Evento | Projeto | Data | Hora | Cachê"): não é uma gig, mas usa ela para saber qual coluna é qual campo.
Uma coluna vazia ("Sunrise | | 20:00") não desloca as outras: o campo vazio é null e as demais colunas continuam no mesmo campo.

EXEMPLO 3 — com rótulos: "Aniversário 50 anos — Projeto: Samba Raiz — Data: 22/11/2026 — Início: 20h30 — Cachê: R$ 900" vira title "Aniversário 50 anos", project "Samba Raiz", date "2026-11-22", time "20:30", fee 900. Rótulos ("cachê", "valor" → fee; "projeto", "banda" → project; "local" → location) não entram no valor do campo.

CADA GIG
- title: o nome da gig como está escrito (evento, casa, local, contratante), SEM a parte da banda/projeto (veja project). Se só houver o local, use o local. Não invente.
- date: AAAA-MM-DD. Datas brasileiras vêm como dia/mês ("15/10", "15/10/26", "sáb 15 de outubro"). Sem ano escrito: use o ano de hoje, a menos que o documento mostre outro ano (título, cabeçalho, outras linhas). Se a data estiver ilegível ou ausente: null.
- time: horário de início em HH:MM, 24h ("21h" vira "21:00", "20h30" vira "20:30", "9 da noite" vira "21:00"). Se houver faixa ("20h às 23h"), time é só o início. Se não houver horário: null.
- endTime: horário de término em HH:MM, 24h, SOMENTE se a lista o informa (faixa "20h às 23h", "21:00-00:30", "até 1h"). Se não houver: null. Não calcule nem deduza a duração.
- fee: o cachê em reais como NÚMERO (nunca texto), sem símbolo nem rótulo ("$400" vira 400, "R$ 1.500,00" vira 1500, "Cachê: R$ 1.200,00" vira 1200, "800,50" vira 800.5, "1.5k" vira 1500). No Brasil o ponto separa milhar e a vírgula separa centavos. Se não houver valor: null. Não some nem calcule.
- project: a banda ou projeto pelo qual o músico foi contratado, quando a lista indica. Pode vir em uma coluna própria, entre parênteses ou colchetes, depois de um traço junto do nome da gig, ou com rótulo ("Projeto:", "Banda:", "com"). Escreva como está. Se não houver: null.
- location: cidade, endereço ou nome do local, SOMENTE se estiver escrito e não for o próprio title. Senão null.
- notes: outras informações úteis da linha (contratante, formato, observações). Senão null.

REGRAS
- UMA GIG POR OBJETO. Nunca divida uma gig em vários objetos (um com o nome, outro com a data): junte tudo o que é da mesma gig num só. Melhor devolver 8 gigs completas que 20 pela metade.
- Os exemplos acima são ilustração, NÃO formato obrigatório. Quem importa quase sempre cola a lista de outra pessoa e não pode reescrever: formato diferente dos exemplos é o caso normal. Entenda pelo significado, aceite emoji, marcadores, dia da semana, "dia 12", "12 de julho", "20h"/"8pm", "150 reais"/"150 pix".
- NUNCA devolva lista vazia porque o formato é estranho. Linha incompleta entra com null no que falta (melhor a pessoa completar o horário na tela do que perder a gig).
- Nunca invente nada. Campo ausente é null.
- Não devolva a linha inteira como title: tire dele a data, a hora, o cachê e o nome do grupo.
- Não elimine repetidas: se a mesma gig aparece duas vezes, devolva as duas.
- Ignore cabeçalhos de coluna, linhas de total e linhas vazias.`;

/**
 * A gig list is the opposite of a repertoire document: a few dozen short lines, but each one written however the band
 * leader felt like — so the job is understanding, not copying. The "flash" models go first here (the shared chain starts
 * with the "lite" ones, which have the daily quota a 200-song repertoire needs); the lite ones stay as the fallback, and
 * a band's 8 reads a day never come close to the flash quota anyway.
 */
const GIG_MODELS = ['gemini-3.5-flash', 'gemini-3.7-flash'];

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
        // Ordem explícita: sem ela o decodificador escolhe a ordem a cada vez, e foi escrevendo o `time` que ele
        // entrou em laço e abandonou o resto do JSON. Com a ordem fixa os campos saem sempre na mesma sequência.
        propertyOrdering: ['title', 'date', 'time', 'endTime', 'fee', 'project', 'location', 'notes'],
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
  const parsed = await generateJson({ ...opts, instructions: instructions(dayKey()), schema: RESPONSE_SCHEMA, text: tidy(text), label: 'gig import', models: GIG_MODELS });
  return cleanGigImport(parsed);
}
