
import type { GraphNodeType, GraphEdgeType } from "@/actions/graph";

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
  pergunta?: string;
  prioridadeRevisao: number;
  width: number;
  height: number;
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
    case "ASSUNTO":
      return { width: 84, height: 84 }; // círculo
    case "TOPICO":
      return { width: 104, height: 56 }; // elipse
    case "NOTA":
      return { width: 68, height: 84 }; // retângulo vertical (menor)
    case "FLASHCARD":
      return { width: 84, height: 84 }; // quadrado
    case "CONCEITO":
    default:
      return { width: 104, height: 46 }; // retângulo horizontal
  }
}

export function runForceLayout(
  rawNodes: GraphNodeType[],
  rawEdges: GraphEdgeType[],
  width: number,
  height: number,
): { nodes: SimNode[]; edges: SimEdge[] } {
  const nodes: SimNode[] = rawNodes.map((n) => {
    const { width: nodeW, height: nodeH } = getNodeDimensions(n.type);
    return {
      id: n.id,
      label: n.label,
      group: n.type,
      dominio: n.nivelDominio,
      prioridadeRevisao: n.prioridadeRevisao,
      parentId: n.parentId,
      pergunta: n.pergunta,
      tipoReal: n.type,
      x: width / 2 + (Math.random() - 0.5) * 600,
      y: height / 2 + (Math.random() - 0.5) * 400,
      vx: 0,
      vy: 0,
      width: nodeW,
      height: nodeH,
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
        let dx = a.x - b.x;
        let dy = a.y - b.y;
        let dist = Math.sqrt(dx * dx + dy * dy) || 1;
        let force = repulsion / (dist * dist);
        let fx = (dx / dist) * force;
        let fy = (dy / dist) * force;
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
      let dx = b.x - a.x;
      let dy = b.y - a.y;
      let dist = Math.sqrt(dx * dx + dy * dy) || 1;
      let force = (dist - idealEdgeLen) * attraction;
      let fx = (dx / dist) * force;
      let fy = (dy / dist) * force;
      a.vx += fx;
      a.vy += fy;
      b.vx -= fx;
      b.vy -= fy;
    }

    // Gravity toward center
    for (const node of nodes) {
      node.vx += (width / 2 - node.x) * gravity;
      node.vy += (height / 2 - node.y) * gravity;
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
        let dx = b.x - a.x;
        let dy = b.y - a.y;
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

    // Update positions
    for (const node of nodes) {
      node.vx *= damping;
      node.vy *= damping;
      node.x += node.vx * temperature;
      node.y += node.vy * temperature;
      node.x = Math.max(node.width / 2, Math.min(width - node.width / 2, node.x));
      node.y = Math.max(node.height / 2, Math.min(height - node.height / 2, node.y));
    }
  }

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