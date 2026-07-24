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

## Fases
- **F1 — IA + contrato:** use-case `GradeFeynmanExplanation` (LlmPort) + endpoint
  `POST /ai/feynman/grade` `{ alvoTipo, alvoId, texto }`; monta o contexto do alvo.
- **F2 — Persistência + rastreio:** modelos `ExplicacaoFeynman`/`EstadoFeynman`
  (migração aditiva); salvar tentativa; SM-2-lite por clareza.
- **F3 — Superfícies:** tela/modal Feynman (explicação + feedback + refino), reusável;
  ação no conceito (grafo/listagem) e no flashcard; salvar como Nota.
- **F4 — Modo de estudo em série:** varredura por escopo (baralho/assunto/problemas).
- **F5 — Analytics:** aba "Feynman" (clareza no tempo, conceitos explicados, lacunas
  fechadas) reusando o módulo analytics.

## Decisões (todas travadas)
1. ✅ **Subtipo da Nota:** reusar `EXPLICACAO` (sem mudança de schema).
2. ✅ **Rastreio por alvo:** modelos **novos** `ExplicacaoFeynman` + `EstadoFeynman`
   (isolado, migração aditiva).
3. ✅ **Escopo do Modo Feynman:** **por baralho**, **por assunto**, **conceitos-problema**
   e **conceito avulso** (a ação no grafo/listagem = escopo de 1).

Fonte da verdade das regras de engenharia: `AGENTS.md`.
