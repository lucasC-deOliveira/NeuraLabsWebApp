# NeuraLabs — melhorias do vault e do estudo

Levantadas em 02/08/2026, durante a construção do grafo de estudo do concurso ABGF.
Revisadas contra o código em 10/08/2026 — duas premissas do levantamento original
estavam erradas e estão corrigidas abaixo.

Ordem = prioridade **revisada** (por retorno sobre esforço, não pela ordem original).

---

## 1. Sincronizar QUESTAO/PROVA pelo vault — ✅ FEITO em 10/08/2026

**Era o bloqueador.** O vault sincronizava 7 tipos de nó e questões de múltipla
escolha não estavam entre eles: existiam só via API/UI (`/provas`, `/questions`,
`/provas/from-parsed`). Deu para gerar 383 flashcards como `.md` versionados; as
196 questões da FCC extraídas para o mesmo concurso não tinham esse caminho.

**Como ficou.** `QUESTION` e `PROVA` são nós do vault como qualquer outro.

- `QUESTION` → `Resources/`, `PROVA` → `Projects/` (ao lado do baralho).
- Corpo da questão: `## Enunciado`, `## Alternativas`, `## Gabarito`, `## Explicação`.
- `tipoQuestao` no frontmatter (`MULTIPLA_ESCOLHA` | `VERDADEIRO_FALSO`) — a coluna
  não tem default no Prisma.
- Relações: `PROVA CONTEM QUESTION`, `QUESTION TESTA|HERDA CONCEITO`,
  `QUESTION PERTENCE_A TOPICO`.

**Metade já existia e o levantamento não sabia:** o enum `TipoNode` no Prisma já
tinha `QUESTION`/`PROVA` e o projetor de export já lia questão. O que faltava era a
camada de vault (serializar o `.md`, o upsert do Push) e as relações.

**Achados do caminho, que valem como aviso:**

- `export-graph.use-case` espalha a projeção de conteúdo **por cima** do nó, e o
  projetor de `QUESTION` devolvia uma chave `tipo` (o `TipoQuestao`) que sobrescrevia
  o tipo do NÓ — toda questão saía do Pull como `tipo: MULTIPLA_ESCOLHA`. Renomeado
  para `tipoQuestao`. Qualquer projetor novo tem de evitar colidir com `tipo`, `ref`,
  `posicaoX`, `posicaoY` e `nivelDominio`.
- A tabela de relações do **frontend** não tinha nenhum par de questão/prova,
  enquanto a do backend tinha. Divergência silenciosa: a UI deixava criar o que o
  Push descartava sem avisar. As duas tabelas precisam ser espelhadas à mão.

**O que ficou de fora.** Nada disso foi exercitado contra um Postgres real —
`npm run test:integration` não está na CI, e os upserters de QUESTION/PROVA e o
`syncProvas` estão cobertos só por teste de unidade da lógica pura. O primeiro
Pull/Push de verdade com as 196 questões ainda é o teste que falta.

---

## 2. Limpeza de órfãos no vault — ✅ FEITO em 10/08/2026

> Era o item 5.
>
> **Correção de uma afirmação errada minha.** Numa revisão anterior deste arquivo
> eu disse que `compareSyncState` era "código morto, chamado só pelo próprio spec".
> **É falso** — ela sempre esteve ligada em `VaultSyncModal.tsx` (`runCompare`).
> A conclusão veio de um `grep | head` truncado, que cortou antes do match no
> `.tsx`. Fica o registro porque o erro quase mandou refazer o que existia.

**Problema real, encontrado na prática.** Renomear um conceito muda o `id` (derivado
por hash do título) e portanto o nome do arquivo. O gerador só escreve — o arquivo
antigo **fica no vault**. Durante o projeto do ABGF isso deixou **19 arquivos órfãos**
com conteúdo *errado* convivendo com a versão corrigida, incluindo um conceito que
afirmava que OLA e UC existem no ITIL 4.

**O que realmente faltava.** A detecção existia e já aparecia na UI, mas só como
**contagem** — "Só no vault: 19". Não dizia *quais* arquivos, e não havia como
removê-los: era preciso caçá-los na mão no explorador.

**Como ficou.**

- `compareSyncState` passou a devolver `orphans: VaultOrphan[]` (`id`, `titulo`,
  `relPath`), não só o número. O nó é pareado com o arquivo de onde veio.
- Componente `VaultOrphans` lista os caminhos (teto de 8 + "e mais N") e oferece a
  remoção atrás de uma **confirmação em dois cliques** — apagar não tem volta.
- IPC novo `vault:delete-files`, deliberadamente estreito: recusa qualquer caminho
  que escape da pasta do vault e qualquer arquivo que não termine em `.md`, e
  devolve o que apagou **e** o que recusou. A UI mostra os dois.
- A remoção nunca acontece como efeito colateral de Pull ou Push.

---

## 3. Documentação contraditória sobre Push/Pull — ✅ FEITO em 10/08/2026

**Resolvido qual dos dois está certo** (era a dúvida do levantamento original).

O `AGENTS.md` gerado pelo app está **certo**: *"use Pull para baixar o grafo do
backend para esta pasta e Push para enviar suas mudanças de volta"*. É o que o
código faz — `pullVault` escreve os `.md` a partir do backend, `pushVault` lê os
`.md` e envia.

O `C:\Users\LucasC\Documents\CLAUDE.md` está **errado**: *"clique em Vault → Pull
para sincronizar de volta"* deveria dizer **Push**. Um agente que siga essa linha
sobrescreve o próprio trabalho com o estado do backend.

**Como ficou.** `Documents/CLAUDE.md` corrigido em quatro pontos (o cabeçalho, o
passo de criar nó, o fluxo resumido e a lista "Não faça"), com um aviso explícito
de que **Pull descarta o que ainda não foi enviado**. Aproveitado para documentar
`QUESTION`/`PROVA`, que o item 1 acabara de tornar sincronizáveis e que faltavam
na tabela de tipos e na de relações.

Um erro extra encontrado ali: a linha *"Não remova arquivos — o Pull ignora
arquivos ausentes"* estava errada **duas vezes**. É o Push que reage a arquivo
ausente, e ele **não ignora**: `removeMissing` solta o nó daquele grafo (a
entidade, as arestas e o SRS ficam). Reescrita para dizer o que o código faz.

---

## 4. SRS enxergando a `dataAlvo` — ✅ FEITO em 10/08/2026

> Era o item 3, e é bem menor do que o levantamento dizia.

**Correção do levantamento original.** O levantamento afirmava que `deadline`,
`dataProva`, `cronograma` e `cram` tinham zero ocorrências — verdade, mas ele
procurou os nomes errados, e no bundle instalado. **`dataAlvo` existe**:
`study-plan-repository.ts`, `plan-projection.ts`, `PlanSetup.tsx`.

**O que de fato falta.** `dataAlvo` só alimenta o *Plano de Estudo* — `suggestedPerDay`
e `onTrack`, isto é, quantos cartões por dia para bater a meta. O **SRS não a conhece**:
`spaced-repetition.ts` não tem nenhuma referência a ela. O agendamento de intervalo
segue indiferente à data da prova, e agenda para outubro um cartão que precisa ser
revisto antes de 27/09.

**Como ficou.** `capIntervalToTarget` encolhe o intervalo para caberem
`REVISOES_ANTES_DO_ALVO` (3) revisões antes do prazo. O SM-2 não foi tocado: o teto
é aplicado depois, e só na fase REVIEW — LEARN e RELEARN contam em minutos e já
caem muito antes de qualquer prazo.

- Sem `dataAlvo`, ou depois que ela passa, o SM-2 volta a ser o de sempre: o modo
  prazo não é uma penalidade permanente.
- `nearestDeadline` escolhe QUAL prazo vale. O usuário pode ter vários planos e um
  card pode estar em mais de um, então não existe "o plano dono do card" para
  perguntar. Vence o prazo mais próximo ainda à frente: comprimir na direção da
  prova mais perto só pode adiantar uma revisão, nunca empurrá-la para depois de
  uma data que importa. Planos inativos e prazos vencidos são ignorados.
- O `SubmitReviewUseCase` passou a ler os planos (fora da transação: é leitura de
  configuração, não faz parte do fato "revisou o card").

---

## 5. Validação antes do Push — ✅ FEITO em 10/08/2026

**Problema.** Erro de formato no `.md` só aparece como rejeição no backend.

**Como ficou.** `validateVault` (`src/lib/vault-validate.ts`) confere frontmatter
ilegível, ids duplicados, pasta errada por tipo, alvo `[[id]]` inexistente, par
tipo→tipo não permitido, peso fora de 0.1–2, `FLASHCARD` sem Pergunta/Resposta,
`QUESTION` sem Enunciado/Gabarito e conceito que nenhum cartão ou questão testa.

Duas decisões que valem registro:

- **Reaproveita o parser de `vault-format`** em vez de reimplementar a leitura. Um
  validador com parser próprio aprova o que o Push recusa.
- **`erro` vs `aviso` distingue o que quebra do que some calado.** Erro = o Push
  recusa ou grava coisa errada. Aviso = o Push passa mas descarta algo sem dizer
  (aresta inválida, alvo inexistente, peso coagido) — que é justamente o que
  ninguém percebe sem uma lista.

Roda junto da comparação e aparece no modal de Vault. Com erro, o Push para no
primeiro clique; o segundo envia assim mesmo — o vault é do usuário.

**Não virou CLI.** A proposta pedia um `vault:validate` de linha de comando, mas
não há runner de TypeScript instalado (`tsx`/`vite-node`), e as alternativas eram
adicionar dependência ou duplicar o parser em `.mjs`. Rodar antes do Push dentro
do app entrega o mesmo valor sem nenhuma das duas.

**Correção do levantamento original.** Ele mandava "portar o `validate.mjs` que
escrevi (~80 linhas)". Esse arquivo **não existe mais** — não sobrou em `Documents`
nem no repositório. É reescrever, não portar.

---

## 6. Campo `pesoEdital` no nó — ✅ FEITO em 10/08/2026

**Problema.** Não há como registrar quanto um tópico vale na prova. Hoje o `peso` da
aresta `PERTENCE_A` é usado como gambiarra (1.6 crítico / 1.2 importante / 0.8
manutenção).

**Impacto.** `/importance` e `/roadmap` otimizam por topologia do grafo, não por
retorno na prova. No edital da ABGF, Gestão de TI vale o mesmo que Engenharia de
Software — o grafo não tem como saber disso.

**Como ficou.** Campo `pesoEdital` no frontmatter, ponta a ponta até o roadmap.

**Fica em `grafo_nodes` (a contenção), não em `nodes_conhecimento`.** O peso é do
edital, não do conceito: o mesmo tópico vale coisas diferentes em dois concursos, e
o nó é compartilhado entre grafos desde a migração do nó do sistema. Migração
aditiva e nullable (`20260810120000_add_peso_edital`).

- `containNode` ganhou o parâmetro e é a única exceção à sua idempotência: com peso
  informado ele **atualiza** a contenção, porque o peso é editado no arquivo e um
  Push tem de conseguir mudá-lo. `undefined` (campo ausente) preserva o que existe;
  `null` apaga.
- No score (`roadmap-score.ts`), estar no edital continua sendo a **condição** e o
  peso apenas **gradua**: fora do edital é 0 por mais pesado que seja. Normalizado
  pelo maior peso presente, não por um teto fixo — a escala é do usuário.
- **Sem pesos declarados, o ranking é bit a bit o de antes** (peso ausente = 1
  neutro). Quem nunca preencher o campo não vê diferença nenhuma.
- O peso entra no `motivo` ("cobrado pelo edital (peso 1.6)") para a ordem ficar
  legível.
- A leitura **global** de importância não carrega peso: somar pesos de concursos
  diferentes numa escala só não quer dizer nada. Só a leitura por grafo carrega.

**Não aplicada ao banco.** A migração está escrita e versionada, mas nunca rodou —
não há Postgres acessível nesta máquina. Precisa de `npm run prisma:deploy` (ou
`prisma:migrate`) antes de o campo existir de verdade.
