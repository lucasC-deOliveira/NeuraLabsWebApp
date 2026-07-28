# Plano — Feature "Plano de Estudo" + Estudo Intercalado

## A ideia (3 camadas)
- **Roadmap** (já existe): ordem MACRO dos conceitos (pré-requisito + prioridade). "O quê, em que ordem".
- **Plano de estudo** (NOVO): alocação no TEMPO. "Quanto/dia, novo vs revisão, até quando".
- **Sessão intercalada** (já existe — `applyInterleaving` + `orderByReadiness`): ordem MICRO numa sentada.

Roadmap = rota · Plano = velocidade + destino · Sessão = o volante.
O plano é a **ponte que falta**: hoje o roadmap existe mas o estudo não o obedece
(`findNewCards` puxa novos sem ordem). O plano faz o estudo seguir o roadmap.

## Decisões travadas
- **Meta diária fixa** definida pelo usuário: por **TEMPO** (min) ou **NOVOS** (nº). Sempre do usuário; a data nunca sobrescreve.
- **Escopo por grafo/prova** (alinha com o roadmap, que é por grafo+modo). Vários planos coexistem por objetivo.
- **Prioridade = modo do roadmap:** `PROVA` (o que mais cai) · `EDITAL` (ênfase) · `PROVA_EDITAL` · `IA` (fallback quando não há prova/edital).
- **Data-alvo opcional:** com data → projeção + viabilidade ("no seu ritmo termina em X / precisa de Y/dia") e botão "ajustar meta"; sem data → "completar todo o conteúdo" com data projetada.

## Modelo (migração aditiva, sem reset)
`PlanoEstudo`: `usuarioId`, `grafoId`, `prioridade` (PROVA|EDITAL|PROVA_EDITAL|IA),
`provaId?`/`editalId?`, `metaTipo` (TEMPO|NOVOS), `metaValor`, `dataAlvo?` (null = sem prazo),
`ativo`, timestamps. Unique `(usuarioId, grafoId, prioridade)`.
Progresso do dia = **derivado** (revisões de hoje + novos introduzidos), sem tabela de tracking nova.

## Domínio puro (0 token, TDD) — `modules/study/domain/services`
- `daily-plan.ts` → `buildDailyTarget`: revisões vencidas + re-explicações Feynman vencidas são a
  espinha (sempre entram); o orçamento restante vira novos até a meta. Se a espinha estoura o
  tempo → 0 novos + aviso "backlog alto".
- `plan-projection.ts` → `projectCompletion`: conceitos restantes ÷ ritmo → data projetada; vs
  `dataAlvo` → on-track + sugestão de nº/dia.
- `roadmap-new-cards.ts` → `pickNewCards`: percorre os conceitos na ordem do roadmap puxando seus
  cards NOVOS até o limite.
- Estimativa de tempo: `avgSecondsPerCard` do histórico real (`RevisaoFlashcard.tempoResposta`).

## Fase B — roadmap dirige os novos
`RoadmapNewCardsQuery`: carrega a trilha `(grafo, modo)`, mapeia conceito→flashcards NOVOS **via
arestas do grafo** (o `conceitoId` relacional é nulo pro usuário real; conceitos vivem em
`ConhecimentoAresta`), aplica `pickNewCards`. Reusa o padrão de `PrismaConnectedConceptsQuery`.

## Fase A — o plano
- `GetTodayPlanUseCase`: config + due (card + Feynman, escopados) + trilha → alvo do dia (buildDailyTarget) + projeção.
- `StartPlannedSessionUseCase`: monta o pool do dia (due card + Feynman due + novos por roadmap) e
  **reusa `orderByReadiness` + `applyInterleaving`**. Escopo = grafo.
- Endpoints: `GET /study/plan/:grafoId/today`, `POST /study/plan`, `POST /study/plan/:grafoId/session`.

## Fase C — intercalar por tópico (opcional)
`applyInterleaving` já é genérico (`WithConcept`) → aceitar chave de agrupamento conceito|tópico.

## Integração
- **Dashboard:** card "Plano de hoje" (anel + "X revisões · Y novos · ~Z min · 🔥streak") vira o CTA
  principal → `/estudo`. (Revive a antiga `/study`, agora dirigida pelo plano.)
- **Analytics (mão dupla):** CONSOME `retentionForecast` (projeção/carga), `ConceptWeakSpots`/problem
  cards (injeta reforço), `maturity` (% dominado real). PRODUZ aba **"Plano"** (aderência, ritmo
  novos×revisões, dominados no tempo, projetado vs real) — reusa `chart-shell`/`StreakCard`.
- **Feynman:** `EstadoFeynman.proximaRevisao` entra no **pool do dia** (re-explicações vencidas);
  clareza é **porta de "dominado"** (cards maduros + Feynman = conceito fechado); ao maturar os cards
  de um conceito, o plano **sugere a sessão Feynman (3 ângulos)** como capstone.

## Página dedicada `/estudo`
Hoje (anel + Estudar agora) · Progresso & projeção (% roadmap, término, viabilidade vs prova, streak)
· A seguir no roadmap (próximos conceitos, travados por pré-req) · Ritmo (novos×revisões/dia, via skill dataviz)
· ⚙ Editar (prioridade · meta diária · data-alvo).

## Fases de entrega
1. **B** — roadmap→novos (`RoadmapNewCardsQuery` + domínio puro `pickNewCards`).
2. **A** — `PlanoEstudo` + `buildDailyTarget`/projeção + página `/estudo` + player intercalado escopado + card Dashboard + aba Plano.
3. **C** — intercalar por tópico.

Fonte da verdade das regras de engenharia: `AGENTS.md`.
