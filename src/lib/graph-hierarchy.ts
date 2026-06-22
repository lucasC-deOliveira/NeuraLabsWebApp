// Derivação da hierarquia de clusters do grafo.
//
// O grafo de conhecimento tem uma hierarquia semântica de tipos:
//   ASSUNTO (0)  →  centro de gravidade de cada cluster (raiz)
//   TOPICO  (1)  →  orbita o ASSUNTO
//   CONCEITO(2)  →  orbita o TOPICO
//   comuns  (3)  →  FLASHCARD/NOTA/BARALHO/TEXTO_BRUTO/QUESTION/PROVA/GRAFO_REF
//                   orbitam o CONCEITO (apenas orbitam o cluster)
//
// O backend NÃO preenche `parentId`; a hierarquia precisa ser inferida das
// arestas + níveis de tipo. Para cada nó atribuímos:
//   • parentId  — o nó-pai (vizinho mais próximo de nível estritamente acima),
//                 usado pela força orbital (anéis concêntricos ao redor do pai).
//   • clusterId — a raiz da cadeia de pais (o ASSUNTO da árvore), usado pelas
//                 forças de cluster para separar assuntos diferentes e puxar
//                 cada nó em direção ao seu assunto (centro de gravidade).
//
// Função pura e determinística.

/** Nível na hierarquia: menor = mais perto da raiz (ASSUNTO). */
export const TYPE_LEVEL: Record<string, number> = {
  ASSUNTO: 0,
  TOPICO: 1,
  CONCEITO: 2,
  // nós comuns (folhas) — todos no mesmo nível, orbitam conceitos
  FLASHCARD: 3,
  NOTA: 3,
  BARALHO: 3,
  TEXTO_BRUTO: 3,
  QUESTION: 3,
  PROVA: 3,
  GRAFO_REF: 3,
};

const LEAF_LEVEL = 3;
export const levelOf = (type: string): number => TYPE_LEVEL[type] ?? LEAF_LEVEL;

export interface HierarchyNode {
  id: string;
  type: string;
  /** Assunto-raiz do grafo: nível acima de todos, ancora o layout. Os demais
   *  assuntos (e quaisquer nós órfãos) passam a tê-lo como pai (orbitam-no). */
  isRoot?: boolean;
}

/** Nível do nó na hierarquia, considerando o root (acima do ASSUNTO). */
const ROOT_LEVEL = -1;
function nodeLevel(n: HierarchyNode): number {
  return n.isRoot ? ROOT_LEVEL : levelOf(n.type);
}
export interface HierarchyEdge {
  source: string;
  target: string;
  peso?: number;
}

export interface HierarchyEntry {
  /** nó-pai (nível estritamente acima); ausente para raízes/órfãos */
  parentId?: string;
  /** id do ancestral que é o centro do cluster principal do nó (o ASSUNTO, ou o
   *  nó não-folha mais alto da cadeia). `undefined` quando o nó não tem nenhum
   *  ancestral não-folha — folhas NUNCA viram cluster próprio. */
  clusterId?: string;
  /** id do subtree (ancestral-ou-próprio) em cada nível hierárquico:
   *  [0]=ASSUNTO, [1]=TOPICO, [2]=CONCEITO. Posições sem ancestral ficam
   *  `undefined`. Usado pela repulsão de clusters aninhada (assunto separa de
   *  assunto; tópico separa de tópico dentro do assunto; conceito de conceito
   *  dentro do tópico). Folhas (nível 3) nunca aparecem aqui — só orbitam. */
  subtreeIds: (string | undefined)[];
}

/**
 * Deriva parentId + clusterId para cada nó a partir das arestas e dos níveis
 * de tipo. O pai de um nó é o vizinho de nível estritamente mais alto (número
 * de nível menor) mais próximo via busca em largura; entre candidatos à mesma
 * distância, prefere o de nível mais próximo do filho, depois maior peso da
 * aresta, depois menor id (desempate determinístico).
 */
export function deriveHierarchy(
  nodes: HierarchyNode[],
  edges: HierarchyEdge[],
): Map<string, HierarchyEntry> {
  const result = new Map<string, HierarchyEntry>();
  if (nodes.length === 0) return result;

  const levelById = new Map<string, number>();
  for (const n of nodes) levelById.set(n.id, nodeLevel(n));
  const rootNode = nodes.find((n) => n.isRoot);

  // adjacência não-direcionada, guardando o peso da aresta
  const adj = new Map<string, { to: string; peso: number }[]>();
  for (const n of nodes) adj.set(n.id, []);
  for (const e of edges) {
    const peso = e.peso && e.peso > 0 ? e.peso : 1;
    adj.get(e.source)?.push({ to: e.target, peso });
    adj.get(e.target)?.push({ to: e.source, peso });
  }

  // ── 1. parentId: BFS até o nó de nível estritamente acima mais próximo ──────
  const parentOf = new Map<string, string | undefined>();
  for (const node of nodes) {
    const myLevel = levelById.get(node.id)!;
    // root (-1) e assuntos (0) não buscam pai por BFS: não há nível acima
    // alcançável por arestas. Assuntos são anexados ao root logo abaixo.
    if (myLevel <= 0) { parentOf.set(node.id, undefined); continue; }

    // BFS por saltos; em cada fronteira coleta candidatos de nível < myLevel.
    const visited = new Set<string>([node.id]);
    let frontier: { id: string; firstPeso: number }[] = [
      { id: node.id, firstPeso: 0 },
    ];
    let parent: string | undefined;

    while (frontier.length > 0 && parent === undefined) {
      const next: { id: string; firstPeso: number }[] = [];
      // candidatos encontrados nesta fronteira (mesma distância)
      let best: { id: string; level: number; peso: number } | null = null;

      for (const cur of frontier) {
        for (const { to, peso } of adj.get(cur.id) ?? []) {
          if (visited.has(to)) continue;
          visited.add(to);
          const toLevel = levelById.get(to) ?? LEAF_LEVEL;
          // peso do primeiro salto a partir do nó original (para desempate)
          const firstPeso = cur.id === node.id ? peso : cur.firstPeso;

          if (toLevel < myLevel) {
            // candidato a pai: prefere nível mais alto (mais próximo do filho),
            // depois maior peso, depois menor id
            if (
              best === null ||
              toLevel > best.level ||
              (toLevel === best.level && firstPeso > best.peso) ||
              (toLevel === best.level && firstPeso === best.peso && to < best.id)
            ) {
              best = { id: to, level: toLevel, peso: firstPeso };
            }
          } else {
            // mesmo nível ou abaixo: continua a busca por aqui
            next.push({ id: to, firstPeso });
          }
        }
      }

      if (best) parent = best.id;
      else frontier = next;
    }

    parentOf.set(node.id, parent);
  }

  // ── 2. Anexa ao root: todo nó sem pai derivado (assuntos e órfãos) passa a
  // orbitar o Assunto-raiz, ancorando o grafo inteiro nele. O root nunca tem pai.
  if (rootNode) {
    for (const node of nodes) {
      if (node.id === rootNode.id) continue;
      if (parentOf.get(node.id) === undefined) parentOf.set(node.id, rootNode.id);
    }
  }

  // subtreeIds[level]: sobe a cadeia de pais e registra o ancestral (ou o próprio
  // nó) de cada nível 0..2. Folhas (nível 3) não ocupam nenhuma posição.
  const subtreeIdsOf = (id: string): (string | undefined)[] => {
    const ids: (string | undefined)[] = [undefined, undefined, undefined];
    const seen = new Set<string>();
    let cur: string | undefined = id;
    while (cur !== undefined && !seen.has(cur)) {
      seen.add(cur);
      const lvl = levelById.get(cur) ?? LEAF_LEVEL;
      // só níveis 0..2 (assunto/tópico/conceito); root (-1) e folhas (3) ficam fora
      if (lvl >= 0 && lvl <= 2) ids[lvl] = cur;
      cur = parentOf.get(cur);
    }
    return ids;
  };

  for (const node of nodes) {
    const sub = subtreeIdsOf(node.id);
    // clusterId = ancestral não-folha mais alto (assunto, ou tópico, ou conceito).
    // Nunca é o root (root fica fora de subtreeIds) nem uma folha — então folhas
    // e o próprio root nunca formam cluster próprio.
    result.set(node.id, {
      parentId: parentOf.get(node.id),
      clusterId: sub[0] ?? sub[1] ?? sub[2],
      subtreeIds: sub,
    });
  }

  return result;
}
