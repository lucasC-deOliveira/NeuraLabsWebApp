import type {
  CompositionEdge,
  CompositionGraph,
  CompositionNode,
  CompositionNodeType,
} from '../composition-views';
import type { CompositionInput, ConceptChain } from '../ports/composition-source';

// Relações estruturais (vocabulário do grafo — ver relation-rules.ts).
const CONTEM = 'CONTEM';
const HERDA = 'HERDA';
const PERTENCE_A = 'PERTENCE_A';

interface Registrar {
  node: (id: string, type: CompositionNodeType, label: string) => void;
  edge: (source: string, target: string, rel: string) => void;
}

// Adiciona a cadeia folha → conceito → tópico → assunto (deduplicada pelo registrar).
function addChain(reg: Registrar, leafId: string, chain: ConceptChain): void {
  const c = chain.conceito;
  if (!c) return;
  reg.node(c.id, 'CONCEITO', c.nome);
  reg.edge(leafId, c.id, HERDA);
  if (!c.topico) return;
  reg.node(c.topico.id, 'TOPICO', c.topico.nome);
  reg.edge(c.id, c.topico.id, PERTENCE_A);
  if (!c.topico.assunto) return;
  reg.node(c.topico.assunto.id, 'ASSUNTO', c.topico.assunto.nome);
  reg.edge(c.topico.id, c.topico.assunto.id, PERTENCE_A);
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
    addChain(reg, leaf.id, leaf);
  }
  return { nodes: [...nodes.values()], edges: [...edges.values()] };
}
