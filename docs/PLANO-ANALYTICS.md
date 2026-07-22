# Plano — Analytics de estudo (flashcards, questões, baralhos, provas)

Objetivo: transformar os dados de estudo em insight acionável. Hoje os analytics
são básicos (acurácia geral, devidos hoje) e espalhados (dashboard home + modais
do grafo). Provas/questões **não persistem nada** (score do quiz é efêmero).

## Decisões (alinhadas)
- **Ordem:** flashcards primeiro (dado já existe → ganho rápido), depois captura +
  análise de provas/questões, depois rollup por baralho/assunto.
- **Local:** home mostra KPIs-resumo com link para uma página **`/analytics`
  dedicada** (abas) que aprofunda.
- **Provas:** rastrear **histórico de tentativas** (N por prova, curva de progresso).

## O que já existe (não duplicar)
- Dashboard home (`src/modules/dashboard`): acurácia geral, devidos hoje, grid de
  assuntos, atividade recente por sessão.
- Grafo (`DashboardCharts`): métricas de ESTRUTURA do grafo (nós/arestas/hubs) —
  não é desempenho de estudo.
- "Onde você mais erra" por conceito (`diagnoseConceptErrors`, `ConceptWeakSpots`)
  + mapa de calor no grafo.

## Dados disponíveis
- **Flashcards (ricos):** `RevisaoFlashcard` (`acertou`, `nivelConfianca`,
  `tipoErro` ⚠️ nunca analisado, `tempoResposta` ⚠️ subusado, `sessaoId`→data),
  `AprendizadoFlashcard` (SM-2: `fase`, `intervalo`, `fatorEase`, `proximaRevisao`,
  `dificuldade`), `DesempenhoNo` (por nó: `taxaAcerto`, `confiancaMedia`),
  `SessaoEstudo`. Flashcard → `conceitoId`, e N:N com `Baralho` (`BaralhoFlashcards`).
- **Questões/Provas:** SEM tentativa/resultado. `StudyProvaModal` calcula score/
  tempo em estado React e descarta. → Fase B cria a persistência.

## Arquitetura
Módulo dedicado **`analytics`** (hexagonal, os dois lados) — é cross-cutting (lê
flashcards, provas, baralhos). Não incha `study`/`provas`.
- Backend `backend/src/modules/analytics/`: read-models (CQRS leitura) por Prisma +
  serviços de domínio PUROS para as derivações (testáveis, sem IO). Controller/módulo
  em `backend/src/analytics/`. Endpoints `GET /api/analytics/*`.
- Frontend `src/modules/analytics/`: `domain` (tipos + derivações puras),
  `application/ports`, `infra/http`, `presentation` (página + abas + gráficos).
  Gráficos com **Recharts** (já usado; seguir a skill `dataviz`).
- Rota nova `/analytics` em `src/main.tsx`; item no menu.

## Variedade de gráficos (Recharts)

Cada métrica com a forma que melhor a comunica — visual rico e variado. Antes de
codar qualquer gráfico, carregar a skill `dataviz` (cores, acessibilidade, tema
claro/escuro, formas). Paleta prevista:

| Gráfico | Onde | Comunica |
|---|---|---|
| **Radar** | perfil de desempenho (Fase A); maestria por assunto e perfil de baralho (Fase D) | forças/fraquezas em várias dimensões de uma vez |
| **Line / Area** | tendência de acurácia (A); progresso de score por prova (C) | evolução no tempo |
| **Bar (v/h)** | forecast de revisões, taxonomia de erro (A); questões mais erradas (C); comparar baralhos (D) | ranking / distribuição |
| **Stacked bar** | maturidade ao longo do tempo (A/D) | composição que muda |
| **Pie / Donut** | mix de maturidade, acurácia por tipo (A/C) | proporção de um todo |
| **Scatter** | velocidade × acerto (A) | correlação entre 2 eixos |
| **Calendar heatmap** | streak / revisões por dia (A) | intensidade por dia |
| **Treemap** | maestria por assunto/tópico (D) | hierarquia + magnitude |
| **Gauge / progress radial** | taxa de retenção, KPIs-resumo (home) | um número contra uma meta |

**Radar — usos concretos:**
- **Perfil de desempenho** (Fase A): eixos = Acurácia, Velocidade, Confiança,
  Retenção, Consistência, Maturidade — um "raio-X" do seu estudo num gráfico.
- **Maestria por assunto** (Fase D): um eixo por assunto/tópico → onde você domina
  e onde falha, de relance. Sobrepor duas séries (ex.: mês passado × agora).
- **Perfil de baralho** (Fase D): comparar 2–3 baralhos nas mesmas dimensões.

---

## Fase A — Analytics de flashcards (dado já existe)

Entrega a página `/analytics` (aba **Flashcards**) + KPIs-resumo na home.

**Métricas (serviço de domínio puro + query Prisma):**
1. **Forecast de revisões** — contagem de cards por vencimento (hoje / 7d / 30d),
   agrupado por dia (de `proximaRevisao`). → BarChart.
2. **Mix de maturidade** — learning (`fase` LEARN/RELEARN), jovem (REVIEW `intervalo`<21),
   maduro (≥21). → Pie/stacked bar.
3. **Tendência de acurácia** — revisões por dia/semana → % acerto. → LineChart.
4. **Velocidade × acerto** — `tempoResposta` médio por grade/acerto; rápido e certo
   vs devagar e errado. → stat + scatter.
5. **Taxonomia de erro** — contagem por `tipoErro` (sinal hoje ignorado). → BarChart.
6. **Cartões-problema (leeches)** — mais lapsos / menor ease / menor acurácia. → lista.
7. **Streak + revisões/dia** — calendário-heatmap (reusar `heatmap-color.ts`).
8. **Perfil de desempenho (radar)** — Acurácia, Velocidade, Confiança, Retenção,
   Consistência, Maturidade normalizados 0–100 num só radar (o "raio-X" do estudo).

**Home:** cartões-resumo (streak, a revisar 7d, % maduro) + um mini-radar do perfil,
com link "Ver analytics".

**Testes:** cada derivação pura tem spec; adapters com fake nomeado.

---

## Fase B — Capturar tentativas de prova/questão (fundação)

**Modelos novos (migration Prisma):**
```
model TentativaProva {
  id, usuarioId, provaId, dataInicio, dataFim,
  acertos Int, total Int, tempoTotalMs Int
  respostas RespostaQuestao[]
  @@index([usuarioId, provaId])   // histórico por prova (retakes)
}
model RespostaQuestao {
  id, tentativaId, questaoId, respostaEscolhida String, acertou Boolean, tempoRespostaMs Int?
}
```
(As questões são respondidas dentro de uma prova via `StudyProvaModal` — não há
prática avulsa hoje; então `RespostaQuestao` pende de `TentativaProva`.)

**Backend:** use-case `RecordProvaAttempt` (persiste a tentativa + respostas ao
finalizar), adapter Prisma, `POST /api/provas/:id/tentativas`. Hexagonal.

**Frontend:** `StudyProvaModal` → ao finalizar, envia a tentativa (score + respostas
+ tempos). Sem mudança visual do quiz.

---

## Fase C — Analytics de questões/provas (usa a Fase B)

Aba **Questões/Provas** na `/analytics`:
- **Progresso por prova** — score de cada tentativa no tempo. → LineChart (retakes).
- **Questões mais erradas** — % de acerto por questão entre tentativas → ranking.
- **Acurácia por tipo** (múltipla escolha × V/F) e **por conceito** (`questao.conceitoId`).
- **Cobertura do edital** — desempenho por objeto de avaliação (quando há `Edital`).

---

## Fase D — Rollup por baralho/assunto + consolidação

Aba **Baralhos** e enriquecimento da **Visão geral**:
- **Por baralho** (N:N `BaralhoFlashcards`): acurácia, mix de maturidade, forecast,
  cards estudados; comparar baralhos (onde você é forte/fraco). → BarChart + tabela.
- **Maestria por assunto/tópico** — rollup de `DesempenhoNo` + acurácia subindo a
  hierarquia de conceitos. → **radar** (um eixo por assunto, sobrepondo períodos)
  + treemap (hierarquia + magnitude).
- **Perfil de baralho** — comparar 2–3 baralhos nas mesmas dimensões. → **radar**.
- **Visão geral** consolida KPIs de flashcards + provas + baralhos.

---

## Ordem de execução
A → B → C → D. Cada fase é um (ou poucos) commit(s) independente(s), com gate verde
(lint:strict + arch:check + test; backend + frontend). Fase A já entrega valor
visível; B é fundação sem UI nova; C/D dependem de B.

Fonte da verdade das regras de engenharia: `AGENTS.md`.
