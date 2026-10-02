# Decisão: planos, preços e limites (sessão de 2026-10-02)

Cards do Trello: #22 (reestudar o preço) e #23 (formato para freelancers). Problema levantado pelos amigos: "caro", que na prática é "caro para o tamanho" (músico sozinho paga o mesmo que uma banda) e "caro para um app recém-lançado". Na data da decisão não havia nenhum pagante: a janela para mudar era essa.

## Tipos de conta
- **Banda**: equipe, escala, despesas, som, divisão de lucro entre sócios, convites. Sem limite de repertório.
- **Freela**: uma pessoa que toca para várias bandas. Agenda, projetos (um por banda/contratante, para ver quanto recebeu de cada), Relatório "Meus cachês", Google Agenda, importações. **Sem** equipe, escala, despesas, divisão de lucro nem convites. Repertório: catálogo de até **150 músicas** e **3 repertórios**.
- O tipo é escolhido ao criar a conta. Contas existentes são Banda. Banda → Freela é bloqueado pelo app (o admin pode reclassificar); Freela → Banda mantém os dados.

## Preços (R$)
| | Mensal | Anual (10 meses) |
|---|---|---|
| Banda (principal) | 49,90 | 499,00 |
| Banda, Fundador (50 vagas, só a principal Banda de cada pessoa, só mensal) | 24,90 | — |
| Freela (principal) | 14,90 | 149,00 |
| Adesão Banda | 29,90 | 299,00 |
| Adesão Freela | 9,90 | 99,00 |

- Teste grátis de 7 dias só na **primeira** conta da pessoa. Adesão é cobrada desde a criação.
- **Principal** = a conta mais cara que a pessoa paga (Banda antes de Freela; depois o Fundador; depois a mais antiga). As demais são adesão. Assim Freela + adesão de Banda nunca sai mais barato que uma Banda sozinha. Se a principal cancela, a próxima vira principal e passa ao preço cheio na renovação.

## Cota de importações por IA
20 por mês por conta, gigs e repertório somados, só leitura bem-sucedida conta, zera no dia 1 (Brasília). Vale para Banda e Freela. O painel `/admin` pode ajustar a cota de uma conta.

## Ordem de entrega (feita toda na homologação em 2026-10-02)
Tipo de conta + migration; limites do Freela; cota de importação; escolha no cadastro; cobrança (adesão, principal, Stripe); textos (landing, FAQ, tour). Detalhes técnicos: `DOCUMENTATION.md` §57.
