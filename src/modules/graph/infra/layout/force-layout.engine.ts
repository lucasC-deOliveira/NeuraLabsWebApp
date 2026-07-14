
import type { GraphNodeType, GraphEdgeType } from "../../domain/types/graph.types";
import { deriveHierarchy } from "@/lib/graph-hierarchy";

const RELATION_LABELS: Record<string, string> = {
  GERA: "gera",
  REFERENCIA: "referência",
  DEFINE: "define",
  EXPLICA: "explica",
  APROFUNDA: "aprofunda",
  EXEMPLIFICA: "exemplifica",
  CONTRASTA: "contrasta",
  SINTETIZA: "sintetiza",
  ALERTA_ERRO: "alerta erro",
  IS_A: "é um",
  PART_OF: "parte de",
  PREREQUISITO: "pré-requisito",
  DERIVA_DE: "deriva de",
  EVOLUI_PARA: "evolui para",
  REFORCA: "reforça",
  ALTERNATIVA_A: "alternativa",
  CONTRASTA_COM: "contrasta com",
  CONFUNDE_COM: "confunde com",
  ANTI_PADRAO_DE: "anti-padrão",
  MEDIDO_POR: "medido por",
  OBJETIVO_DE: "objetivo de",
  PERTENCE_A: "pertence a",
  FUNDAMENTA: "fundamenta",
  APLICADO_EM: "aplicado em",
  SUBTOPICO_DE: "subtópico de",
  RELACIONADO: "relacionado",
  DEPENDE_DE: "depende de",
  HERDA: "herda",
  TESTA_DEFINICAO: "testa definição",
  TESTA_EXEMPLO: "testa exemplo",
  TESTA_APLICACAO: "testa aplicação",
  TESTA_ANALISE: "testa análise",
  TESTA_SINTESE: "testa síntese",
};

export interface SimNode {
  id: string;
  label: string;
  group: string;
  dominio: number;
  x: number;
  y: number;
  vx: number;
  vy: number;
  tipoReal: string;
  parentId?: string;
  /** raiz da árvore hierárquica (ASSUNTO) — força orbital/cluster */
  clusterId?: string;
  /** id do subtree por nível [ASSUNTO, TOPICO, CONCEITO] — repulsão aninhada */
  subtreeIds?: (string | undefined)[];
  /** nó imóvel: a simulação nunca atualiza sua posição (usado por nós ocultos) */
  fixed?: boolean;
  pergunta?: string;
  prioridadeRevisao: number;
  width: number;
  height: number;
  /** Nó com posição salva no backend — não é movido pela simulação de força */
  pinned?: boolean;
}

export interface SimEdge {
  source: string;
  target: string;
  label: string;
  type: string;
  peso: number;
  sourceX: number;
  sourceY: number;
  targetX: number;
  targetY: number;
}
// Dimensões por forma do nó — tamanhos FIXOS para que os nós tenham um
// tamanho uniforme entre si (não variam pelo rótulo, que é truncado na
// renderização). Apenas a proporção muda conforme a forma:
// ASSUNTO = círculo, TOPICO = elipse, CONCEITO = retângulo horizontal,
// NOTA = retângulo vertical, FLASHCARD = quadrado
function getNodeDimensions(type: string): { width: number; height: number } {
  switch (type) {
    case "ASSUNTO":    return { width: 84,  height: 84  }; // círculo
    case "TOPICO":     return { width: 104, height: 56  }; // elipse
    case "NOTA":       return { width: 68,  height: 84  }; // retângulo vertical
    case "FLASHCARD":  return { width: 84,  height: 84  }; // quadrado
    case "CONCEITO":
    default:           return { width: 104, height: 46  }; // retângulo horizontal
  }
}

export function runForceLayout(
  rawNodes: GraphNodeType[],
  rawEdges: GraphEdgeType[],
  width: number,
  height: number,
): { nodes: SimNode[]; edges: SimEdge[] } {
  // Hierarquia derivada das arestas+tipos (o backend não preenche parentId):
  // ASSUNTO → TOPICO → CONCEITO → comuns. Alimenta a força orbital e as de cluster.
  const hierarchy = deriveHierarchy(rawNodes, rawEdges);

  const nodes: SimNode[] = rawNodes.map((n) => {
    const { width: nodeW, height: nodeH } = getNodeDimensions(n.type);
    const hier = hierarchy.get(n.id);
    // usa posição salva no backend quando disponível (não zero); nós sem posição
    // (novos do vault, primeiros na carga) recebem posição aleatória e são movidos
    // pela simulação até assentar naturalmente entre os nós fixos.
    const hasSaved = n.posicaoX != null && n.posicaoY != null && (n.posicaoX !== 0 || n.posicaoY !== 0);
    return {
      id: n.id,
      label: n.label,
      group: n.type,
      dominio: n.nivelDominio,
      prioridadeRevisao: n.prioridadeRevisao,
      parentId: hier?.parentId ?? n.parentId,
      clusterId: hier?.clusterId,
      subtreeIds: hier?.subtreeIds,
      pergunta: n.pergunta,
      tipoReal: n.type,
      x: hasSaved ? n.posicaoX! : width / 2 + (Math.random() - 0.5) * 600,
      y: hasSaved ? n.posicaoY! : height / 2 + (Math.random() - 0.5) * 400,
      vx: 0,
      vy: 0,
      width: nodeW,
      height: nodeH,
      pinned: hasSaved,
    };
  });

  const edges: SimEdge[] = rawEdges.map((e) => ({
    source: e.source,
    target: e.target,
    label: RELATION_LABELS[e.type] ?? e.type,
    type: e.type,
    peso: e.peso,
    sourceX: 0,
    sourceY: 0,
    targetX: 0,
    targetY: 0,
  }));

  const nodeMap = new Map(nodes.map((n) => [n.id, n]));

  // Se todos os nós já têm posição salva, não há nada a simular: pula o loop
  // O(n²×500) e vai direto para atualizar as coordenadas das arestas.
  const allPinned = nodes.every(n => n.pinned);

  if (!allPinned) {
  const repulsion = 12000;
  const attraction = 0.004;
  const gravity = 0.008;
  const damping = 0.9;
  const idealEdgeLen = 200;
  const minGap = 80;

  for (let iter = 0; iter < 500; iter++) {
    const temperature = 1 - iter / 500;

    // Repulsion between all pairs
    for (let i = 0; i < nodes.length; i++) {
      for (let j = i + 1; j < nodes.length; j++) {
        const a = nodes[i];
        const b = nodes[j];
        const dx = a.x - b.x;
        const dy = a.y - b.y;
        const dist = Math.sqrt(dx * dx + dy * dy) || 1;
        const force = repulsion / (dist * dist);
        const fx = (dx / dist) * force;
        const fy = (dy / dist) * force;
        a.vx += fx;
        a.vy += fy;
        b.vx -= fx;
        b.vy -= fy;
      }
    }

    // Attraction along edges
    for (const edge of edges) {
      const a = nodeMap.get(edge.source);
      const b = nodeMap.get(edge.target);
      if (!a || !b) continue;
      const dx = b.x - a.x;
      const dy = b.y - a.y;
      const dist = Math.sqrt(dx * dx + dy * dy) || 1;
      const force = (dist - idealEdgeLen) * attraction;
      const fx = (dx / dist) * force;
      const fy = (dy / dist) * force;
      a.vx += fx;
      a.vy += fy;
      b.vx -= fx;
      b.vy -= fy;
    }

    // Força orbital hierárquica (mesmos raios-alvo do physicsStep)
    const ORBITAL_RADII_L: Record<string, number> = {
      ASSUNTO: 560, // orbita o Assunto-raiz (anel mais externo)
      TOPICO: 300, CONCEITO: 180,
      NOTA: 115, FLASHCARD: 115, BARALHO: 115,
      TEXTO_BRUTO: 115, QUESTION: 115, PROVA: 115, GRAFO_REF: 115,
    };
    for (const node of nodes) {
      if (!node.parentId) continue;
      const parent = nodeMap.get(node.parentId);
      if (!parent) continue;
      const target = ORBITAL_RADII_L[node.group] ?? 220;
      const dx = node.x - parent.x;
      const dy = node.y - parent.y;
      const d = Math.sqrt(dx * dx + dy * dy) || 0.01;
      const f = 0.006 * (d - target);
      const ux = dx / d;
      const uy = dy / d;
      node.vx -= ux * f;
      node.vy -= uy * f;
      if (!parent.pinned) {
        parent.vx += ux * f * 0.15;
        parent.vy += uy * f * 0.15;
      }
    }

    // Gravity toward center (fraca para nós filhos — orbital já os ancora)
    for (const node of nodes) {
      const gFactor = node.parentId ? 0.15 : 1.0;
      node.vx += (width / 2 - node.x) * gravity * gFactor;
      node.vy += (height / 2 - node.y) * gravity * gFactor;
    }

    // Collision detection
    for (let i = 0; i < nodes.length; i++) {
      for (let j = i + 1; j < nodes.length; j++) {
        const a = nodes[i];
        const b = nodes[j];
        const aHw = a.width / 2;
        const aHh = a.height / 2;
        const bHw = b.width / 2;
        const bHh = b.height / 2;
        const dx = b.x - a.x;
        const dy = b.y - a.y;
        const rA = Math.sqrt(aHw * aHw + aHh * aHh);
        const rB = Math.sqrt(bHw * bHw + bHh * bHh);
        const minDist = rA + rB + minGap;
        const distSq = dx * dx + dy * dy;
        if (distSq < minDist * minDist) {
          const dist = Math.sqrt(distSq) || 0.01;
          const overlap = minDist - dist;
          const sepX = (dx / dist) * (overlap + 2);
          const sepY = (dy / dist) * (overlap + 2);
          a.x -= sepX;
          a.y -= sepY;
          b.x += sepX;
          b.y += sepY;
          a.vx = a.vx * 0.3;
          a.vy = a.vy * 0.3;
          b.vx = b.vx * 0.3;
          b.vy = b.vy * 0.3;
        }
      }
    }

    // Update positions (pinned nodes ficam fixos para ancorar novos nós)
    for (const node of nodes) {
      if (node.pinned) continue;
      node.vx *= damping;
      node.vy *= damping;
      node.x += node.vx * temperature;
      node.y += node.vy * temperature;
      node.x = Math.max(node.width / 2, Math.min(width - node.width / 2, node.x));
      node.y = Math.max(node.height / 2, Math.min(height - node.height / 2, node.y));
    }
  }
  } // end if (!allPinned)

  // Update edge coordinates
  for (const edge of edges) {
    const a = nodeMap.get(edge.source);
    const b = nodeMap.get(edge.target);
    if (a && b) {
      edge.sourceX = a.x;
      edge.sourceY = a.y;
      edge.targetX = b.x;
      edge.targetY = b.y;
    }
  }

  return { nodes, edges };
}