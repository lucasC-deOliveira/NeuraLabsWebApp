import type {
  CompositionEdge,
  CompositionGraph,
  CompositionNode,
  CompositionNodeType,
} from '../composition-views';
import type { CompositionInput, ConceptChainItem } from '../ports/composition-source';

// Relações estruturais (vocabulário do grafo — ver relation-rules.ts).
const CONTEM = 'CONTEM';
const HERDA = 'HERDA';
const PERTENCE_A = 'PERTENCE_A';

interface Registrar {
  node: (id: string, type: CompositionNodeType, label: string) => void;
  edge: (source: string, target: string, rel: string) => void;
}

// Uma cadeia folha → conceito → tópico → assunto (deduplicada pelo registrar).
function addOneChain(reg: Registrar, leafId: string, c: ConceptChainItem): void {
  reg.node(c.conceitoId, 'CONCEITO', c.conceito);
  reg.edge(leafId, c.conceitoId, HERDA);
  if (!c.topicoId || !c.topico) return;
  reg.node(c.topicoId, 'TOPICO', c.topico);
  reg.edge(c.conceitoId, c.topicoId, PERTENCE_A);
  if (!c.assuntoId || !c.assunto) return;
  reg.node(c.assuntoId, 'ASSUNTO', c.assunto);
  reg.edge(c.topicoId, c.assuntoId, PERTENCE_A);
}

function addChains(reg: Registrar, leafId: string, chains: ConceptChainItem[]): void {
  for (const chain of chains) addOneChain(reg, leafId, chain);
}

// Registrar deduplicador: nó por id, aresta por (source→target→rel).
function makeRegistrar(
  nodes: Map<string, CompositionNode>,
  edges: Map<string, CompositionEdge>,
): Registrar {
  return {
    node: (id: string, type: CompositionNodeType, label: string): void => {
      if (!nodes.has(id)) nodes.set(id, { id, type, label });
    },
    edge: (source: string, target: string, rel: string): void => {
      const key = `${source}->${target}->${rel}`;
      if (!edges.has(key)) edges.set(key, { source, target, rel });
    },
  };
}

// Monta o subgrafo composto de um item: o próprio nó, as folhas contidas (CONTEM) e
// a hierarquia de cada folha, tudo deduplicado por id real.
export function buildComposition(input: CompositionInput): CompositionGraph {
  const nodes = new Map<string, CompositionNode>();
  const edges = new Map<string, CompositionEdge>();
  const reg = makeRegistrar(nodes, edges);
  reg.node(input.root.id, input.root.type, input.root.label);
  for (const leaf of input.leaves) {
    if (!input.rootIsLeaf) {
      reg.node(leaf.id, leaf.type, leaf.label);
      reg.edge(input.root.id, leaf.id, CONTEM);
    }
    addChains(reg, leaf.id, leaf.chains);
  }
  return { nodes: [...nodes.values()], edges: [...edges.values()] };
}
