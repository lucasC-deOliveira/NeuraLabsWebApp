// Física do grafo inspirada no modelo barnesHut do vis-network
// (https://visjs.github.io/vis-network/docs/network/physics.html).
// Apenas a física foi reaproveitada — nada da biblioteca é importado.
//
// Modelo de forças aplicado a cada frame:
//   • Repulsão  — todos os pares de nós se repelem (gravitationalConstant),
//                 com massa proporcional ao tamanho do nó.
//   • Molas     — cada aresta é uma mola que tende ao comprimento ideal
//                 (springLength / springConstant), reforçada pelo peso.
//   • Gravidade — uma mola fraca puxa todos os nós para o centro (centroide),
//                 mantendo o grafo coeso e sem deriva (centralGravity).
//   • avoidOverlap — encurta a distância efetiva pelos raios dos nós, fazendo
//                 a repulsão disparar quando dois nós se sobrepõem.
// A integração usa velocidade + damping (atrito): o sistema ESTABILIZA e
// para sozinho — quando a energia fica desprezível devolvemos o mesmo array
// (mesma referência) para não disparar re-render. Função pura.

export type PhysicsNode = {
  id: string;
  x: number;
  y: number;
  vx?: number;
  vy?: number;
  width?: number;
  height?: number;
};

export type PhysicsEdge = { source: string; target: string; peso?: number };

// parâmetros ajustáveis pelo usuário (modal de configurações do grafo).
// Nomes e papéis espelham o solver barnesHut do vis-network.
export type PhysicsOptions = {
  /** força de repulsão entre nós (quanto maior, mais espalhado) */
  gravitationalConstant: number;
  /** atração de todos os nós para o centro (0 = nenhuma, 1 = forte) */
  centralGravity: number;
  /** comprimento ideal das arestas (px) */
  springLength: number;
  /** rigidez das arestas — quão forte elas puxam para o comprimento ideal */
  springConstant: number;
  /** atrito: 0 = sem atrito (oscila), 1 = para na hora */
  damping: number;
  /** evita sobreposição: 0 = ignora tamanho, 1 = afasta totalmente os nós */
  avoidOverlap: number;
};

export const DEFAULT_PHYSICS_OPTIONS: PhysicsOptions = {
  gravitationalConstant: 6000,
  centralGravity: 0.06,
  springLength: 200,
  springConstant: 0.04,
  damping: 0.4,
  avoidOverlap: 0.6,
};

const TIMESTEP = 0.85; // passo de integração por frame
const MAX_VELOCITY = 28; // limite de velocidade por nó (evita "explosões")
const MAX_PAIR_FORCE = 1200; // limite da força de repulsão por par
const MIN_KINETIC = 0.06; // abaixo disto o nó é considerado parado

// raio de colisão aproximado pelo tamanho do nó
const collisionRadius = (n: PhysicsNode) =>
  Math.max(n.width ?? 60, n.height ?? 40) / 2;

// massa: nós maiores são mais "pesados" (movem menos, repelem mais)
const nodeMass = (n: PhysicsNode) => 1 + collisionRadius(n) / 45;

export function physicsStep<T extends PhysicsNode>(
  nodes: T[],
  edges: PhysicsEdge[],
  options: PhysicsOptions = DEFAULT_PHYSICS_OPTIONS,
): T[] {
  const n = nodes.length;
  if (n < 2) return nodes;

  const {
    gravitationalConstant,
    centralGravity,
    springLength,
    springConstant,
    damping,
    avoidOverlap,
  } = options;

  const idx = new Map<string, number>();
  for (let i = 0; i < n; i++) idx.set(nodes[i].id, i);

  const fx = new Float64Array(n);
  const fy = new Float64Array(n);
  const mass = new Float64Array(n);
  const radius = new Float64Array(n);

  let cx = 0;
  let cy = 0;
  for (let i = 0; i < n; i++) {
    const node = nodes[i];
    mass[i] = nodeMass(node);
    radius[i] = collisionRadius(node);
    cx += node.x;
    cy += node.y;
  }
  cx /= n;
  cy /= n;

  // ── Repulsão entre todos os pares (O(n²) — suficiente para estes grafos)
  for (let i = 0; i < n; i++) {
    const ai = nodes[i];
    for (let j = i + 1; j < n; j++) {
      const bj = nodes[j];
      let dx = ai.x - bj.x;
      let dy = ai.y - bj.y;
      let dist = Math.sqrt(dx * dx + dy * dy);
      if (dist < 1e-4) {
        // exatamente sobrepostos: separa numa direção pseudo-aleatória estável
        const ang = (((i * 727 + j * 131) % 628) / 100);
        dx = Math.cos(ang);
        dy = Math.sin(ang);
        dist = 1e-4;
      }
      // avoidOverlap encurta a distância efetiva pelos raios — a repulsão
      // dispara quando os nós encostam
      let eff = dist;
      if (avoidOverlap > 0) {
        eff = dist - avoidOverlap * (radius[i] + radius[j]);
        if (eff < 1) eff = 1;
      }
      let force = (gravitationalConstant * mass[i] * mass[j]) / (eff * eff);
      if (force > MAX_PAIR_FORCE) force = MAX_PAIR_FORCE;
      const ux = dx / dist;
      const uy = dy / dist;
      const fxv = ux * force;
      const fyv = uy * force;
      fx[i] += fxv;
      fy[i] += fyv;
      fx[j] -= fxv;
      fy[j] -= fyv;
    }
  }

  // ── Molas nas arestas (atração para o comprimento ideal)
  for (const e of edges) {
    const i = idx.get(e.source);
    const j = idx.get(e.target);
    if (i === undefined || j === undefined || i === j) continue;
    const a = nodes[i];
    const b = nodes[j];
    let dx = b.x - a.x;
    let dy = b.y - a.y;
    let dist = Math.sqrt(dx * dx + dy * dy);
    if (dist < 1e-4) dist = 1e-4;
    const peso = e.peso && e.peso > 0 ? e.peso : 1;
    const k = springConstant * (0.5 + 0.5 * peso);
    const force = k * (dist - springLength);
    const ux = dx / dist;
    const uy = dy / dist;
    const fxv = ux * force;
    const fyv = uy * force;
    fx[i] += fxv;
    fy[i] += fyv;
    fx[j] -= fxv;
    fy[j] -= fyv;
  }

  // ── Gravidade central: mola fraca de cada nó para o centroide
  if (centralGravity > 0) {
    for (let i = 0; i < n; i++) {
      fx[i] += (cx - nodes[i].x) * centralGravity * 0.05;
      fy[i] += (cy - nodes[i].y) * centralGravity * 0.05;
    }
  }

  // ── Integração com velocidade + damping
  const retain = 1 - Math.max(0, Math.min(1, damping));
  let moved = false;

  const next = nodes.map((node, i) => {
    let vx = ((node.vx ?? 0) + (fx[i] / mass[i]) * TIMESTEP) * retain;
    let vy = ((node.vy ?? 0) + (fy[i] / mass[i]) * TIMESTEP) * retain;

    const speed = Math.hypot(vx, vy);
    if (speed > MAX_VELOCITY) {
      const s = MAX_VELOCITY / speed;
      vx *= s;
      vy *= s;
    }

    // nó praticamente parado: zera a velocidade e fica onde está
    if (Math.abs(vx) < MIN_KINETIC && Math.abs(vy) < MIN_KINETIC) {
      if ((node.vx ?? 0) === 0 && (node.vy ?? 0) === 0) return node;
      moved = true;
      return { ...node, vx: 0, vy: 0 };
    }

    moved = true;
    return {
      ...node,
      x: node.x + vx * TIMESTEP,
      y: node.y + vy * TIMESTEP,
      vx,
      vy,
    };
  });

  return moved ? next : nodes;
}
