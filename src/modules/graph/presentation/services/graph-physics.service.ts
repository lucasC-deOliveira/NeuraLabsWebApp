// Física orbital do grafo: em cada relação origem→destino, o nó DESTINO
// orbita lentamente o nó ORIGEM. A origem fica parada — a não ser que ela
// mesma seja destino de outra relação (aí orbita a origem dela, e quem a
// orbita acompanha). Nós que não são destino de ninguém são âncoras fixas.
// Função pura — o hook só aplica o resultado por frame.

export type PhysicsNode = {
  id: string;
  x: number;
  y: number;
};

export type PhysicsEdge = { source: string; target: string };

const ORBIT_SPEED = 0.004; // rad/frame (~26s por volta a 60fps)
const MAX_ARC = 0.5; // arco máximo px/frame — raios grandes giram mais devagar
const ORBIT_MIN = 80; // raio mínimo da órbita
const ORBIT_MAX = 300; // raio máximo da órbita
const RADIUS_STEP = 0.8; // ajuste máximo do raio por frame (convergência suave)

export function physicsStep<T extends PhysicsNode>(
  nodes: T[],
  edges: PhysicsEdge[],
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

  return nodes.map((n) => {
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

    // o raio converge suavemente para a faixa [ORBIT_MIN, ORBIT_MAX]
    const targetRadius = Math.min(ORBIT_MAX, Math.max(ORBIT_MIN, d));
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
}
