# Plano — Técnica Feynman no app

## A ideia (o loop)
1. Escolher um **conceito** (ou a resposta de um **flashcard**). 2. Explicar com
**palavras simples** ("ensine para uma criança"). 3. A IA avalia: **clareza**,
**jargão sem explicar**, **lacunas** (pontos que faltaram → conceitos a revisar) e
sugere **analogia/reescrita**. 4. Refina; a explicação boa vira **Nota** ligada ao
conceito e o progresso é **rastreado** (clareza no tempo + re-explicação espaçada).

## Decisões travadas
- **Âncora:** conceito **+ flashcard** ("explique a resposta com suas palavras").
- **Superfície:** um **Modo Feynman** (estudo em série) **+** ação **"Explicar (Feynman)"**
  no conceito (grafo/listagem) e no flashcard.
- **Feedback da IA (tudo):** nota de clareza · lacunas→conceitos · jargão · analogia/reescrita.
- **Persistência:** salva como **Nota** (subtipo `EXPLICACAO`) ligada ao conceito **+**
  rastreio (analytics de clareza no tempo + SRS de re-explicação).

## Peças e reuso (o que já existe)
- **IA:** `LlmPort` + `openai-llm.adapter` (backend/src/modules/ai). Novo use-case
  `GradeFeynmanExplanation` monta o contexto do alvo (descrição do conceito + notas/
  flashcards conectados + pré-requisitos do grafo) e pede à LLM o feedback estruturado.
- **Grafo/lacunas:** as lacunas apontam para **conceitos/pré-requisitos** do grafo
  (reusa a vizinhança do conceito e a detecção de gaps/prereqs que já existe na IA).
- **Notas:** a explicação final vira uma **NOTA** (`SubtipoNota.EXPLICACAO`) ligada ao
  conceito — entra no grafo de conhecimento (reusa criação de nó/nota + aresta).
- **SRS + Analytics:** `SessaoEstudo`/`DesempenhoNo` como referência; clareza alta →
  intervalo maior (SM-2-lite). Analytics reusa o módulo `analytics` (nova aba).

## Modelo de dados (aditivo — migração sem reset, como a Fase B do analytics)
- **`ExplicacaoFeynman`** (uma por tentativa, para o histórico/analytics):
  `usuarioId`, `alvoTipo` (CONCEITO|FLASHCARD), `alvoId`, `texto`, `clareza` (0-100),
  `lacunas` (json), `jargao` (json), `dataCriacao`.
- **`EstadoFeynman`** (agendamento por alvo): `usuarioId`, `alvoTipo`, `alvoId`,
  `ultimaClareza`, `intervalo`, `proximaRevisao`. (Alternativa: estender `DesempenhoNo`.)
- **Nota Feynman:** reusa o modelo de NOTA existente; ligada ao conceito no grafo.

## Superfícies (onde entra)
1. **Modo Feynman (estudo em série)** — escolhe escopo: um **baralho**, um **assunto**,
   ou os **conceitos-problema** do analytics. Itera conceito a conceito: você explica →
   IA dá o feedback → refina → (opcional) salva como Nota → próximo.
2. **Ação no conceito** — botão **"Explicar (Feynman)"** no painel do grafo (ao lado de
   "Insights"/"Expandir") e na listagem de conceitos → abre a mesma tela para 1 alvo.
3. **No flashcard** — no estudo/detalhe do flashcard, **"Explique com suas palavras"**
   (Feynman sobre a resposta), gravado no mesmo histórico.

## Fluxo da IA (entrada → saída)
- **Entrada:** alvo (conceito/flashcard) + contexto (descrição + notas/flashcards
  conectados + pré-requisitos) + a explicação do usuário.
- **Saída (estruturada):** `{ clareza: 0-100, jargao: [termos], lacunas: [{ponto,
  conceitoId?}], analogia: string, reescrita: string }`.
- Loop de refino até "claro"; a saída alimenta o feedback, o rastreio e (se salvar) a Nota.

## Fases (todas concluídas)
- ✅ **F1 — IA:** `GradeFeynmanExplanationUseCase` (LlmPort) + `POST /feynman/grade`.
- ✅ **F2 — Persistência + rastreio:** `ExplicacaoFeynman`/`EstadoFeynman` (migração
  aditiva), SM-2-lite (`nextFeynmanReview`), `POST /feynman/attempts`, botão "Salvar".
- ✅ **F3 — Superfícies:** FeynmanModal/FeynmanPanel; ação no flashcard (listagem) e
  no conceito/flashcard (painel do grafo).
- ✅ **F4 — Modo em série:** `FeynmanSeriesModal` varre os conceitos de um baralho.
- ✅ **F5 — Analytics:** aba "Feynman" (clareza no tempo + totais), `GET /analytics/feynman`.

- ✅ **F7 — 3 ângulos:** explicar o MESMO alvo de 3 formas — **Simples · Analogia ·
  Técnico** — cada uma com sua régua na IA (`feynman-angulo.ts`: rubricas + labels +
  `parseFeynmanAngulo` + `FEYNMAN_CLARO=70` + `isFeynmanSessionComplete`). `grade`
  recebe `angulo`; `POST /feynman/sessions` (`SaveFeynmanSessionUseCase`) salva os 3
  (coluna aditiva `angulo`), agenda pela clareza do **ângulo mais fraco** e publica UMA
  nota combinada (`composeFeynmanNote`, seção por ângulo). Front: `FeynmanPanel` vira 3
  abas com progresso/《Conceito dominado》quando as 3 ≥ 70. Migração
  `20260724120000_add_feynman_angulo` (aditiva).
- ✅ **F6 — Nota no grafo:** ao salvar, a explicação vira uma **NOTA** (`EXPLICACAO`)
  ligada ao alvo e **contida nos mesmos grafos onde o alvo aparece**, renderizando
  imediatamente. Idempotente por alvo (marcador em `Nota.fonte = feynman:<tipo>:<id>`):
  re-salvar atualiza a mesma nota. Aresta `NOTA→CONCEITO (EXPLICA)` ou
  `FLASHCARD→NOTA (TESTA)`. Peças: `feynman-note.ts` (título+marcador),
  `FeynmanNotePublisher` (porta) + `PrismaFeynmanNotePublisher` (adapter, reusa
  `createContainedNode`); o `SaveFeynmanExplanationUseCase` publica após rastrear; no
  grafo o `FeynmanModal` recebe `onSaved={refreshGraph}` para a nota aparecer na hora.

## Decisões (todas travadas)
1. ✅ **Subtipo da Nota:** reusar `EXPLICACAO` (sem mudança de schema).
2. ✅ **Rastreio por alvo:** modelos **novos** `ExplicacaoFeynman` + `EstadoFeynman`
   (isolado, migração aditiva).
3. ✅ **Escopo do Modo Feynman:** **por baralho**, **por assunto**, **conceitos-problema**
   e **conceito avulso** (a ação no grafo/listagem = escopo de 1).

Fonte da verdade das regras de engenharia: `AGENTS.md`.
