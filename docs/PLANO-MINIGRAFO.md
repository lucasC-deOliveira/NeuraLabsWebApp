# Plano — Mini-grafo compositível (alinhado ao grafo)

## A ideia (uma frase)
O **mini-grafo é o próprio grafo, em pequena escala**: cada flashcard / questão /
baralho / prova tem o seu, e **grafos pequenos se somam em grafos maiores** —
usando as **mesmas regras** da funcionalidade de grafo que já existe. Mini-grafo
(local) e grafo (global) são o **mesmo subgrafo** em escalas diferentes.

## O modelo de composição
- **Átomo:** `flashcard`/`questão` → `conceito` → `tópico` → `assunto`.
- **Soma por composição (roll-up):**
  - `baralho` = ∪ (subgrafos dos seus flashcards)  — via `CONTEM`.
  - `prova` = ∪ (subgrafos das suas questões)       — via `CONTEM`.
  - Montar uma prova com uma questão faz a hierarquia daquela questão **entrar na
    conta da prova**; adicionar outra questão **soma**, deduplicando conceitos/
    tópicos/assuntos repetidos.
- **Mini-grafo** de qualquer um dos 4 = esse subgrafo já somado.
- **Importar num grafo = mesclar** esse subgrafo, deduplicando os nós que já
  existem. A **teia entre baralhos/flashcards/provas/questões** emerge aí: dois
  itens que compartilham um conceito passam a se tocar **pelo nó de conceito comum**.

> Natureza fractal: `subgrafo(flashcard) ⊂ subgrafo(baralho) ⊂ grafo`. Os mesmos
> `type`/`tipoRelacao` valem em toda escala.

## Regras existentes que ele DEVE seguir (não criar paralelo)
- **Relações:** `CONTEM` (composição), `PERTENCE_A` (hierarquia
  conceito→tópico→assunto), `RELACIONADO`. Peso por tier (`relationTier`).
- **Derivação relacional → grafo:** `backend/src/graph/knowledge-graph.ts` já
  deriva arestas de composição a partir dos joins (ex.: `ProvaQuestao` → PROVA
  `CONTEM` QUESTION). O mini-grafo estende essa mesma derivação para incluir a
  hierarquia (`PERTENCE_A`).
- **Merge/soma:** `backend/src/graph/graph-import.ts` (`runImportGraph`) já reusa
  nós por nome, deduplica arestas e sincroniza `syncPertenceA` + a m2m do baralho.
  A "soma" e o "trazer junto ao importar" reusam esse merge.
- **Vocabulário de tipos:** `type` ∈ ASSUNTO/TÓPICO/CONCEITO/FLASHCARD/QUESTION/
  PROVA/BARALHO (mesmos do grafo).
- **Cores:** `NODE_TYPE_COLORS` (graph constants) — mesmo mapa nos dois renderers.
- **Ponte de navegação:** deep-link `?focus=<nodeId>` (a página do grafo já lê e
  centra) + `graphsContaining(tipo, id)` para saber em qual grafo abrir.

## Peças (compartilham 1 núcleo)
O **núcleo** produz o subgrafo composto de um item; ele alimenta **duas saídas
co-primárias**: a visualização do mini-grafo **e** a composição ao importar no
grafo normal. Não é "mini-grafo com um import de brinde" — as duas contam igual.

1. **Núcleo — roll-up builder (backend).** Dado `(tipo, id, usuarioId)`, sobe a
   composição e devolve `{ nodes, edges }` no vocabulário do grafo, reusando a
   derivação de `knowledge-graph.ts` + a hierarquia relacional
   (`Conceito.topicoId → Topico.assuntoId → Assunto`). Deduplica por **id real**.
2. **Mini-grafo (frontend).** Troca o SVG em camadas por force-graph 2D estilo
   Obsidian (`react-force-graph-2d`, irmão do `react-force-graph-3d` já usado),
   reusando `NODE_TYPE_COLORS`. Interações: física força-dirigida, arrastar,
   hover destaca vizinhos, zoom/pan, clicar re-centra a teia + "Abrir no grafo"
   (via `?focus=`).
3. **Composição no grafo normal (backend) — o item importado "compõe tudo".**
   > **Gap hoje:** `AddProvaToGraph` só faz `linkProva` (nó da prova, sozinho);
   > `CreateDeck` liga BARALHO `CONTEM` flashcards mas **não** puxa a hierarquia;
   > `knowledge-graph.ts` só deriva arestas do que **já está** no grafo. Compor a
   > árvore ao importar **não existe ainda**.

   Ao adicionar flashcard/questão/baralho/prova a um grafo, injeta o subgrafo do
   núcleo e **mescla** com o existente reusando `runImportGraph` (reuso de nó por
   nome/id, dedup de aresta, `syncPertenceA`, m2m do baralho). Importar um baralho
   → traz seus flashcards + conceitos → tópicos → assuntos, tudo deduplicado.
   **Respeita as regras existentes**, inclusive o `FLASHCARD_NODE_DISPLAY_LIMIT`
   (flashcards/questões podem vir recolhidos/acessíveis pelo painel, como hoje).

## Alinhamento mini ↔ grafo (resumo)
- **Mesmas cores** (`NODE_TYPE_COLORS`), **mesmo vocabulário** (type/rel),
  **mesma derivação** (knowledge-graph), **mesmo merge** (runImportGraph).
- **Renderers seguem diferentes** (global = 3D; local = 2D) — o alinhamento vem de
  dados+cores+regras+ponte, não de unificar o renderer (isso seria outro projeto).

## Decisões a travar
1. **Fonte da hierarquia:** relacional (`conceitoId`) como base (funciona fora de
   grafo); no grafo, o merge usa ids reais para deduplicar. — *recomendado*.
2. **Import: automático ou opt-in?** Toggle "trazer conceitos/tópicos/assuntos
   junto" ligado por padrão, ou sempre traz?
3. **Mini-grafo mostra irmãos?** Núcleo = item + hierarquia somada. Mostrar também
   "outros itens deste conceito" (teia local) já, ou deixar o merge no grafo grande
   cuidar disso? (camada opcional).
4. **Dedup na soma:** por **id real** de conceito/tópico/assunto (nunca por nome).
5. **Profundidade ao importar no grafo:** ✅ **decidido** — a **hierarquia**
   (conceitos → tópicos → assuntos) vem sempre; **flashcards e questões são folhas
   expansíveis/recolhíveis**. Reusa o mecanismo de expandir/retrair subgrafo que já
   existe (`expandedFrom`, `expandSubgrafo`, `expandActionFor`) — não é regra nova.
   Convive com o `FLASHCARD_NODE_DISPLAY_LIMIT` (recolhido por padrão quando muitos).

## Fases
- **F1 — Núcleo:** roll-up builder no backend (reusando knowledge-graph +
  hierarquia), com testes por tipo e teto de tamanho. Extrair `NODE_TYPE_COLORS`
  para ponto compartilhado.
- **F2 — Mini-grafo Obsidian:** `react-force-graph-2d` + cores/vocabulário +
  física + labels; ligar os 4 modais ao núcleo.
- **F3 — Interações + ponte:** hover-destaca, clique re-centra, "Abrir no grafo"
  (`?focus=`), tamanho por grau, tema claro/escuro.
- **F4 — Composição no grafo (co-primária com F2):** ao adicionar item no grafo,
  injetar o subgrafo do núcleo via `runImportGraph` (merge/dedup), respeitando o
  limite de flashcards. Pode ir logo após F1, em paralelo à F2/F3.

Fonte da verdade das regras de engenharia: `AGENTS.md`.
