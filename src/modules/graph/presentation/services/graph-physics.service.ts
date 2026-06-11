// Física orbital do grafo: em cada relação origem→destino, o nó DESTINO
// orbita lentamente o nó ORIGEM. A origem fica parada — a não ser que ela
// mesma seja destino de outra relação (aí orbita a origem dela, e quem a
// orbita acompanha). Nós que não são destino de ninguém são âncoras fixas.
// Função pura — o hook só aplica o resultado por frame.

export type PhysicsNode = {
  id: string;
  x: number;
  y: number;
  width?: number;
  height?: number;
};

export type PhysicsEdge = { source: string; target: string };

const ORBIT_SPEED = 0.004; // rad/frame (~26s por volta a 60fps)
const MAX_ARC = 0.5; // arco máximo px/frame — raios grandes giram mais devagar
const ORBIT_MIN = 80; // raio mínimo da órbita
const ORBIT_MAX = 600; // raio máximo da órbita
const RADIUS_STEP = 0.8; // ajuste máximo do raio por frame (convergência suave)
const MAX_PUSH = 2.0; // empurrão máximo por nó por frame (separação suave)

// parâmetros ajustáveis pelo usuário (modal de configurações do grafo)
export type PhysicsOptions = {
  /** folga mínima entre as bordas de dois nós (repulsão) */
  repulsionGap: number;
  /** folga usada na distância preferida dos aglomerados (atração) */
  clusterGap: number;
};

export const DEFAULT_PHYSICS_OPTIONS: PhysicsOptions = {
  repulsionGap: 200,
  clusterGap: 200,
};

// raio de colisão aproximado pelo tamanho do nó
const collisionRadius = (n: PhysicsNode) =>
  Math.max(n.width ?? 60, n.height ?? 40) / 2;

export function physicsStep<T extends PhysicsNode>(
  nodes: T[],
  edges: PhysicsEdge[],
  options: PhysicsOptions = DEFAULT_PHYSICS_OPTIONS,
): T[] {
  if (nodes.length < 2 || edges.length === 0) return nodes;

  const byId = new Map(nodes.map((n) => [n.id, n]));

  // para cada destino, as origens que ele orbita (arestas órfãs são ignoradas)
  const sourcesOf = new Map<string, string[]>();
  for (const e of edges) {
    if (!byId.has(e.source) || !byId.has(e.target)) continue;
    if (e.source === e.target) continue;
    const list = sourcesOf.get(e.target);
    if (list) list.push(e.source);
    else sourcesOf.set(e.target, [e.source]);
  }
  if (sourcesOf.size === 0) return nodes;

  const rotated = nodes.map((n) => {
    const sources = sourcesOf.get(n.id);
    // não é destino de ninguém: âncora parada
    if (!sources || sources.length === 0) return n;

    // âncora = centro das origens (com múltiplas origens, orbita o conjunto)
    let ax = 0;
    let ay = 0;
    for (const id of sources) {
      const s = byId.get(id)!;
      ax += s.x;
      ay += s.y;
    }
    ax /= sources.length;
    ay /= sources.length;

    const dx = n.x - ax;
    const dy = n.y - ay;
    const d = Math.hypot(dx, dy);

    // sobreposto à âncora: desloca para o raio mínimo para poder orbitar
    if (d < 1e-6) return { ...n, x: ax + ORBIT_MIN, y: ay };

    // aglomeração: nós relacionados tendem a ficar o mais perto possível,
    // convergindo para o limite da repulsão (raios dos dois + folga)
    let anchorRad = 0;
    for (const id of sources) {
      anchorRad = Math.max(anchorRad, collisionRadius(byId.get(id)!));
    }
    const preferred = anchorRad + collisionRadius(n) + options.clusterGap;
    const targetRadius = Math.min(ORBIT_MAX, Math.max(ORBIT_MIN, preferred));
    const radiusDelta = Math.max(-RADIUS_STEP, Math.min(RADIUS_STEP, targetRadius - d));
    const newRadius = d + radiusDelta;
    const ux = dx / d;
    const uy = dy / d;
    const rx = ux * newRadius;
    const ry = uy * newRadius;

    // raios grandes giram em ângulo menor para o arco não passar de MAX_ARC
    const omega = Math.min(ORBIT_SPEED, MAX_ARC / newRadius);
    const cos = Math.cos(omega);
    const sin = Math.sin(omega);
    return {
      ...n,
      x: ax + rx * cos - ry * sin,
      y: ay + rx * sin + ry * cos,
    };
  });

  // ── repulsão: nenhum nó pode sobrepor ou entrar dentro de outro.
  // Só nós em órbita são empurrados (âncoras e isolados ficam onde estão);
  // pares âncora↔próprio destino são regulados pelo raio da órbita, não aqui.
  const anchorPairs = new Set<string>();
  for (const [target, sources] of sourcesOf) {
    for (const s of sources) {
      anchorPairs.add(target < s ? `${target}|${s}` : `${s}|${target}`);
    }
  }

  for (let i = 0; i < rotated.length; i++) {
    for (let j = i + 1; j < rotated.length; j++) {
      const a = rotated[i];
      const b = rotated[j];

      const movableA = sourcesOf.has(a.id);
      const movableB = sourcesOf.has(b.id);
      if (!movableA && !movableB) continue;

      const pairKey = a.id < b.id ? `${a.id}|${b.id}` : `${b.id}|${a.id}`;
      if (anchorPairs.has(pairKey)) continue;

      const minDist = collisionRadius(a) + collisionRadius(b) + options.repulsionGap;
      let dx = b.x - a.x;
      let dy = b.y - a.y;
      let d = Math.hypot(dx, dy);
      if (d >= minDist) continue;

      // sobrepostos exatamente: separa num eixo determinístico
      if (d < 1e-6) {
        dx = 1;
        dy = 0;
        d = 1;
      }

      const overlap = minDist - d;
      const ux = dx / d;
      const uy = dy / d;

      if (movableA && movableB) {
        const push = Math.min(overlap / 2, MAX_PUSH);
        a.x -= ux * push;
        a.y -= uy * push;
        b.x += ux * push;
        b.y += uy * push;
      } else {
        // só um se move: ele leva todo o empurrão (capado)
        const push = Math.min(overlap, MAX_PUSH);
        if (movableA) {
          a.x -= ux * push;
          a.y -= uy * push;
        } else {
          b.x += ux * push;
          b.y += uy * push;
        }
      }
    }
  }

  return rotated;
}
