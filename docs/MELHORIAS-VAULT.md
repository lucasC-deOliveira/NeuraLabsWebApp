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

## 2. Ligar o `compareSyncState` na UI (limpeza de órfãos)

> Era o item 5. Subiu para o topo: é o de melhor esforço/retorno, porque a parte
> difícil já está pronta e morta no repositório.

**Problema real, encontrado na prática.** Renomear um conceito muda o `id` (derivado
por hash do título) e portanto o nome do arquivo. O gerador só escreve — o arquivo
antigo **fica no vault**. Durante o projeto do ABGF isso deixou **19 arquivos órfãos**
com conteúdo *errado* convivendo com a versão corrigida, incluindo um conceito que
afirmava que OLA e UC existem no ITIL 4.

**Correção do levantamento original.** Não é preciso escrever a detecção: ela existe.
`compareSyncState` (`src/lib/vault-sync.ts`) já calcula `backendOnly`, `vaultOnly`,
`different` e `inSync`, e tem 10 testes. **Só que ninguém a chama** — o único
consumidor em todo o repositório é o próprio spec. Está implementada, testada e
inalcançável em produção.

**Proposta.** Expor o resultado na UI de Vault (um aviso antes do Push/Pull) e dar a
ação de remoção — nunca automática, nunca tocando em arquivo que não seja `.md`.

---

## 3. Corrigir a documentação contraditória sobre Push/Pull

**Resolvido qual dos dois está certo** (era a dúvida do levantamento original).

O `AGENTS.md` gerado pelo app está **certo**: *"use Pull para baixar o grafo do
backend para esta pasta e Push para enviar suas mudanças de volta"*. É o que o
código faz — `pullVault` escreve os `.md` a partir do backend, `pushVault` lê os
`.md` e envia.

O `C:\Users\LucasC\Documents\CLAUDE.md` está **errado**: *"clique em Vault → Pull
para sincronizar de volta"* deveria dizer **Push**. Um agente que siga essa linha
sobrescreve o próprio trabalho com o estado do backend.

**Proposta.** Uma linha, num arquivo fora deste repositório.

---

## 4. Fazer o SRS enxergar a `dataAlvo` que já existe

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

**Proposta.** Um modificador no cálculo de intervalo que comprima as revisões conforme
a `dataAlvo` se aproxima, garantindo N revisões por cartão antes do limite. Não é
preciso criar campo nenhum — só ligar o que já está no plano ao cálculo.

---

## 5. `vault:validate` antes do Push

**Problema.** Erro de formato no `.md` só aparece como rejeição no backend.

**Proposta.** Um script que cheque: frontmatter parseável, pasta correta por tipo,
ids duplicados, alvos `[[id]]` inexistentes, pares tipo→tipo não permitidos, peso
fora de 0.1–2, `FLASHCARD` sem `## Pergunta`/`## Resposta`, `QUESTION` sem
`## Enunciado`/`## Gabarito`, conceito órfão sem cartão, e linha `---` solta no
corpo (que quebra o parse do frontmatter).

**Correção do levantamento original.** Ele mandava "portar o `validate.mjs` que
escrevi (~80 linhas)". Esse arquivo **não existe mais** — não sobrou em `Documents`
nem no repositório. É reescrever, não portar.

---

## 6. Campo `pesoEdital` no nó

**Problema.** Não há como registrar quanto um tópico vale na prova. Hoje o `peso` da
aresta `PERTENCE_A` é usado como gambiarra (1.6 crítico / 1.2 importante / 0.8
manutenção).

**Impacto.** `/importance` e `/roadmap` otimizam por topologia do grafo, não por
retorno na prova. No edital da ABGF, Gestão de TI vale o mesmo que Engenharia de
Software — o grafo não tem como saber disso.

**Proposta.** Campo numérico opcional `pesoEdital` no frontmatter, consumido pelo
roadmap. Confirmado em 10/08/2026 que não existe nenhuma ocorrência em `src`,
`backend`, `contracts` ou no schema Prisma.
