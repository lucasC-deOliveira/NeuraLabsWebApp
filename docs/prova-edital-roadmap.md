# Provas, editais e roadmap de estudo no grafo

Documentação das features que estendem o grafo de conhecimento para **provas**,
**editais** e um **roadmap de estudo** priorizável. Continua o trabalho de
"importar prova pelo grafo" (PR #10) e adiciona a camada de priorização.

Convenção-chave (invariante de todo o grafo): cada nó é referenciado pelo seu
**`referenciaId`** (o id da entidade de domínio). `buildKnowledgeGraph` expõe
`node.id = referenciaId`; as arestas (`ConhecimentoAresta`) usam
`NodeConhecimento.id` internamente. Ao derivar/ler relações, mapeia-se sempre o nó
de volta para o `referenciaId`.

---

## 1. Prova pelo grafo

Fluxo: **Adicionar nó → Prova → Importar arquivos** (ou *Vincular existente*).

- **Parse determinístico (0 token):** `extract-exam-questions.ts` /
  `extract-judgment-items.ts` extraem questões de múltipla escolha e de
  verdadeiro/falso (CEBRASPE) sem IA; fallback para LLM só quando a confiança é
  baixa. Gabarito determinístico via `apply-gabarito.ts` / `parse-gabarito.ts`
  (ENEM e CEBRASPE), com sentinela `ANNULLED` para questões anuladas.
- **Classificação em conceitos:** cada questão vira um nó `QUESTION` e ganha
  arestas `TESTA` para os `CONCEITO` que ela avalia
  (`PrismaQuestaoGraphWriter`). Multidisciplinar = várias arestas `TESTA`.
- **Questão ↔ Prova (derivado no render):** a relação `PROVA → QUESTION` **não é
  persistida**. `buildKnowledgeGraph.addDerivedProvaQuestaoEdges` a deduz da
  tabela `ProvaQuestao` na montagem do grafo (aresta `CONTEM`), para os nós PROVA
  e QUESTION presentes. Assim a fonte da verdade é a associação prova↔questão e
  nunca há dessincronização.

---

## 2. Edital como nó

Um grafo pode ter **vários editais e várias provas**, mas cada prova tem **no
máx. 1 edital** e vice-versa (1:1 garantido por `Edital.provaId @unique`).

- **Importar edital:** **Adicionar nó → Edital** (`EditalForm`). A IA lê o
  programa (`extract-edital-syllabus.ts`), planeja a hierarquia
  (`PlanGraphFromEditalUseCase`) e materializa os `ASSUNTO/TOPICO/CONCEITO` que
  faltam (`BuildGraphFromEditalUseCase`, arestas `PERTENCE_A`), reusando nós por
  nome. Retorna `{ plan, programa }`; o `programa` é guardado no nó `EDITAL`.
- **Edital → conceitos (`COBRE`):** o nó `EDITAL` fica ligado a **cada conceito
  que cobre** (novos + reusados) por uma aresta `COBRE`. O build devolve
  `conceitoNodeIds`; `PrismaEditalRepository` cria as arestas `COBRE`.
- **Vínculo 1:1 com prova (`REGE`):** três formas de criar o vínculo:
  1. importar edital escolhendo uma prova do grafo;
  2. importar prova anexando o PDF do edital;
  3. ação **"Vincular edital ↔ prova"** no painel de propriedades
     (`LinkEditalProvaModal`), a partir de um nó PROVA ou EDITAL.
  Conflitos de 1:1 retornam `409` (`ProvaAlreadyHasEditalError` /
  `EditalAlreadyLinkedError`).

---

## 3. Roadmap de estudo

Painel `RoadmapPanel` com **5 modos**:

| Modo | Origem | Sinal de prioridade |
|---|---|---|
| **Por urgência** | local (`roadmap.service.ts`) | `(1 − domínio) × importância`, respeitando pré-requisitos |
| **Prioridade IA** | LLM (`BuildAiRoadmapUseCase`) | ordem gerada pela IA |
| **Por prova** | determinístico (0 token) | frequência em prova (`TESTA`) |
| **Por edital** | determinístico (0 token) | cobertura do edital (`COBRE`) |
| **Prova + edital** | determinístico (0 token) | média dos dois sinais |

Os modos determinísticos pontuam conceitos em `roadmap-score.ts` e ordenam
respeitando pré-requisitos (`prioritizeLearningPath` + `prereqLinks`).

### Persistência incremental

Toda trilha (exceto urgência, que é instantânea e local) é **persistida no
servidor** (`RoadmapTrilha`, uma por grafo × chave) e **recalculada só no delta**:

- `mergeTrilha` (`roadmap-delta.ts`): nós novos entram na **posição de
  prioridade**, a ordem relativa dos itens já presentes é preservada, e nós
  removidos são descartados. Retorna quantos são novos (banner "N novos
  priorizados").
- No modo IA, só os **nós novos** vão ao LLM para serem posicionados
  (`applyPlacements`), com fallback determinístico — evita regenerar tudo e
  gastar tokens à toa.
- **Regerar** força o recálculo completo.

### Escopo por prova / por edital

Como há múltiplas provas/editais, os modos escopam a **um** deles:

- A cobertura (`EditalCoverageSource.load(..., editalId?)`) e a frequência
  (`ConceitoImportanceSource.load(..., provaId?)`) filtram pela prova/edital
  escolhida (ou agregam tudo quando nenhum é passado).
- A trilha é persistida por escopo — a chave de storage dobra o id:
  `prova|p:<id>`, `edital|e:<id>`, `prova_edital|p:<id>|e:<id>`.
- No painel, um seletor (`ScopeSelect`) aparece quando o grafo tem **mais de
  uma** prova/edital; "Prova + edital" mostra os dois seletores.

---

## 4. Medidor de tokens de IA

`TokenUsageMeter` mostra, em tempo real (polling), os tokens de IA gastos na
sessão, medidos no chokepoint dos adapters LLM (`token-usage/`).

---

## Arquitetura (hexagonal)

- **Backend (`backend/src/modules/{ai,provas,graph}`):** `domain` (regras +
  ports puros), `application` (use-cases), `infrastructure` (adapters Prisma/LLM),
  `interface`. Novos ports: `EditalRepository`, `QuestaoGraphWriter`,
  `ConceitoImportanceSource`, `EditalCoverageSource`, `RoadmapTrilhaRepository`,
  `AiRoadmapBuilder`. Wiring em `ai.module.ts` / `provas.module.ts`.
- **Frontend (`src/modules/graph`):** `presentation` chama use-cases pela porta
  `graphHttp` (ACL sobre `@/lib/*-api`); nunca importa `@/lib/*-api` direto.
- **Persistência (`prisma/schema.prisma`):** `enum TipoRelacao` ganhou `COBRE`
  (edital→conceito); `enum TipoNode` já tinha `EDITAL`. Novos modelos: `Edital`
  (1:1 com prova) e `RoadmapTrilha` (trilha persistida por grafo × modo/escopo).
  Migrações aplicadas via `prisma db push` (evita reset por drift).

## Endpoints principais

- `POST /provas/parse-upload`, `POST /provas/from-parsed`,
  `POST /provas/suggest-conceitos`
- `POST /provas/editais`, `POST /provas/editais/:id/link`, `GET /provas/editais`
- `POST /ai/graph/graphs/:grafoId/edital/plan` · `.../edital/build`
- `POST /ai/graph/graphs/:grafoId/roadmap` — body
  `{ modo, regenerate?, provaId?, editalId? }`

## Testes

- Backend unidade: `cd backend && npm test` (inclui `roadmap-score`,
  `roadmap-delta`, `ai-roadmap-placement`, `build-roadmap`, `build-ai-roadmap`,
  `edital.use-cases`, `apply-gabarito`, `extract-judgment-items`, etc.).
- Backend integração: `npm run test:integration` (adapters Prisma).
- Frontend: `npm test` (raiz) — inclui `RoadmapPanel.test.tsx`,
  `CreateNodeModal.test.tsx`.
- Gates: `npm run lint:strict` e `npm run arch:check` (backend e frontend).
