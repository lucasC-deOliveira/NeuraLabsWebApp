// Pré-assenta um layout rodando a física até CONVERGIR (deslocamento máximo por
// frame < SETTLE_EPS) ou atingir um teto de iterações. Antes o big-bang rodava
// 2000 iterações FIXAS mesmo quando o grafo já tinha assentado em ~300 — o que
// travava a montagem. Agora para assim que estabiliza. Puro (sem RAF), testável.
import { physicsStep, type PhysicsNode, type PhysicsEdge, type PhysicsOptions } from "./graph-physics.service";

// Deslocamento máximo (px) de um nó entre dois frames abaixo do qual o layout é
// considerado assentado. ~0.4px/frame é imperceptível e evita iterar à toa.
export const SETTLE_EPS = 0.4;

// Maior deslocamento entre dois frames consecutivos (mesma ordem de índices, que
// physicsStep preserva). Usado como critério de convergência.
function maxDisplacement<T extends PhysicsNode>(prev: T[], next: T[]): number {
  let worst = 0;
  for (let i = 0; i < prev.length; i++) {
    const dx = prev[i].x - next[i].x;
    const dy = prev[i].y - next[i].y;
    const d2 = dx * dx + dy * dy;
    if (d2 > worst) worst = d2;
  }
  return Math.sqrt(worst);
}

/**
 * Roda a física até o grafo assentar ou atingir maxIters, o que vier primeiro.
 * Devolve o layout final. Nós marcados `fixed` (ex.: posições já salvas) ancoram e
 * não se movem — só os novos assentam ao redor, então converge em poucas iterações.
 * @example presettleLayout(nodes, edges, DEFAULT_CLUSTER_OPTIONS, 1200)
 */
export function presettleLayout<T extends PhysicsNode>(
  nodes: T[],
  edges: PhysicsEdge[],
  options: PhysicsOptions,
  maxIters: number,
): T[] {
  let settled = nodes;
  for (let i = 0; i < maxIters; i++) {
    const next = physicsStep(settled, edges, options);
    if (next === settled) break; // física devolveu a mesma ref: parada total
    if (maxDisplacement(settled, next) < SETTLE_EPS) return next;
    settled = next;
  }
  return settled;
}
