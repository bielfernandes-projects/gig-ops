/** Perguntas frequentes exibidas em /suporte. Única fonte: a página e qualquer outro lugar leem daqui. */
export type FaqItem = { q: string; a: string };

export const FAQ: { title: string; items: FaqItem[] }[] = [
  {
    title: 'Começando',
    items: [
      {
        q: 'Como eu começo a usar o Gigueiros?',
        a: 'Crie sua conta, crie a sua banda e cadastre os músicos em "Músicos". Depois é só criar a primeira gig em "Nova Gig" na Agenda, escalar quem toca e definir o cachê de cada um.',
      },
      {
        q: 'Como convido um músico para a banda?',
        a: 'No Perfil fica o código de convite da banda. O músico cria a conta, escolhe "Fui convidado" e informa o código. Se você cadastrou esse músico em "Músicos" com o mesmo e-mail do login dele, ele já entra vinculado ao cadastro.',
      },
      {
        q: 'Por que a gig não aparece na agenda do músico?',
        a: 'Em "Músicos", o e-mail cadastrado precisa ser exatamente o mesmo que o músico usa para entrar no Gigueiros. Com o e-mail igual, a gig aparece para ele assim que você o escalar.',
      },
      {
        q: 'Posso criar um projeto ao criar uma gig?',
        a: 'Sim. No formulário de "Nova Gig", logo abaixo de "Projeto", toque em "+ Novo projeto", digite o nome e ele já fica selecionado.',
      },
    ],
  },
  {
    title: 'Agenda, escala e cachês',
    items: [
      {
        q: 'Já tenho minhas gigs numa planilha ou em texto. Preciso cadastrar uma por uma?',
        a: 'Não. Na Agenda, toque em "Importar gigs" e cole a lista (dá para copiar direto do Excel, Google Planilhas ou WhatsApp) ou envie um arquivo CSV, TXT, DOCX ou PDF. O app identifica data, horário, nome e cachê de cada gig e mostra tudo numa prévia para você conferir e corrigir antes de salvar. As gigs entram sem escala de músicos.',
      },
      {
        q: 'O músico vê o cachê dos colegas?',
        a: 'Não. O músico vê apenas as gigs em que está escalado e o próprio cachê. Valores dos colegas e observações contratuais ficam só com o dono da banda.',
      },
      {
        q: 'Onde vejo meus avisos e as novidades do app?',
        a: 'No sino, no canto superior do Dashboard. Ali ficam os avisos (escala, pagamento, lembretes) e a linha "Atualizações do app", que mostra as novidades, melhorias e correções mais recentes. Quando há algo novo, um pop-up aparece na próxima vez que você abrir ou voltar ao app (e, se você ativou as notificações, também chega um aviso no celular).',
      },
      {
        q: 'Como levo a agenda para o Google Agenda ou o Apple Calendário?',
        a: 'Na Agenda há o aviso de calendário com um link de assinatura (.ics). Basta adicioná-lo ao seu aplicativo de calendário; as novas gigs aparecem automaticamente.',
      },
      {
        q: 'Como recebo avisos de gig nova ou lembretes?',
        a: 'Ative as notificações no Perfil. Você é avisado quando for escalado e recebe os lembretes configurados em cada gig.',
      },
    ],
  },
  {
    title: 'Repertório',
    items: [
      {
        q: 'Já tenho meu repertório pronto. Preciso digitar tudo de novo?',
        a: 'Não. Em "Repertório", use "Importar repertório" e envie um PDF, Word (DOCX) ou TXT. O app lê o arquivo e cria as músicas e os blocos. Você revisa tudo na prévia antes de salvar. O que não estiver no arquivo (tom, artista) fica em branco, nunca é inventado.',
      },
      {
        q: 'Como compartilho o repertório com a banda?',
        a: 'Cada repertório tem um link público para compartilhar por WhatsApp ou por onde preferir. Quem abre o link vê o repertório sem precisar de conta.',
      },
    ],
  },
  {
    title: 'Assinatura e conta',
    items: [
      {
        q: 'Como funciona o teste grátis e a assinatura?',
        a: 'Toda conta nova tem 7 dias de teste grátis, sem cartão. Depois, a assinatura é por conta: Banda por R$ 49,90 por mês (ou R$ 499,00 por ano) e Freela por R$ 14,90 por mês (ou R$ 149,00 por ano). Sem pagamento, a conta passa ao modo somente leitura: seus dados continuam salvos e visíveis.',
      },
      {
        q: 'Qual a diferença entre a conta Banda e a conta Freela?',
        a: 'A Banda é para quem gerencia um grupo: escala músicos, controla despesas, som, divisão de lucro e convida a equipe. A Freela é para quem toca para várias bandas e quer organizar as próprias gigs e cachês: tem agenda, projetos (um por banda que te chama), Relatório de cachês, Google Agenda e até 150 músicas em 3 repertórios, mas não tem equipe, escala nem despesas. Dá para subir de Freela para Banda sem perder seus dados.',
      },
      {
        q: 'Posso ter mais de uma conta?',
        a: 'Pode. Em Perfil, "Criar outra conta". A conta mais cara que você paga fica com o preço cheio; cada conta a mais é uma adesão e custa menos: Banda extra R$ 29,90 por mês (R$ 299,00 por ano) e Freela extra R$ 9,90 por mês (R$ 99,00 por ano). A adesão é cobrada desde a criação, sem teste grátis.',
      },
      {
        q: 'Quantas importações por IA posso fazer?',
        a: 'Cada conta tem 20 importações por mês, somando importação de gigs e de repertório. Só conta a leitura que deu certo, e a cota zera no dia 1. A tela de importar mostra quantas você já usou.',
      },
      {
        q: 'Como cancelo a assinatura?',
        a: 'Em Perfil, toque em "Gerenciar assinatura". O acesso segue até o fim do período já pago e não há nova cobrança depois disso.',
      },
      {
        q: 'Como peço reembolso ou a exclusão da minha conta?',
        a: 'Em até 7 dias após a primeira cobrança você pode pedir o reembolso. Para reembolso ou exclusão de conta, envie uma mensagem pelo formulário abaixo.',
      },
    ],
  },
];
