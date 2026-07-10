// Estratégia O(n log n) para a física de grafos grandes, onde a repulsão exata
// O(n²) do graph-physics.service vira gargalo.
//
//   • Repulsão n-body → Barnes-Hut: um quadtree agrupa nós distantes pelo centro
//     de massa; uma célula é aproximada por um único corpo quando s/d < THETA
//     (mesma ideia do d3-force / solver barnesHut do vis-network).
//   • Distância mínima (anti-sobreposição) → grid espacial uniforme: cada nó só
//     é comparado com os das 9 células vizinhas (O(n) com densidade limitada).
//
// Só a repulsão-base (F = gc·mᵢ·mⱼ / d², limitada) é aproximada; a separação por
// raio fica com o grid de distância mínima. Usado apenas acima de um limiar de nós
// (grafos pequenos seguem no caminho exato, com avoidOverlap/cluster completos).

const THETA = 0.7;
const THETA2 = THETA * THETA;
const MAX_DEPTH = 24;
const JITTER2 = 1e-8;

// Quadtree em Structure-of-Arrays: uma alocação por frame, sem objeto por nó.
interface Quadtree {
  x0: Float64Array; // canto superior-esquerdo da célula
  y0: Float64Array;
  s: Float64Array; // lado da célula (quadrada)
  cx: Float64Array; // centro de massa (soma ponderada durante insert → média em finalizeCom)
  cy: Float64Array;
  m: Float64Array; // massa acumulada
  body: Int32Array; // índice do corpo numa folha de 1 nó; -1 vazio; -2 interno/agregado
  child: Int32Array; // 4 filhos por nó (NW,NE,SW,SE), -1 = ausente
  used: number;
}

function makeTree(cap: number): Quadtree {
  return {
    x0: new Float64Array(cap),
    y0: new Float64Array(cap),
    s: new Float64Array(cap),
    cx: new Float64Array(cap),
    cy: new Float64Array(cap),
    m: new Float64Array(cap),
    body: new Int32Array(cap),
    child: new Int32Array(cap * 4),
    used: 0,
  };
}

function newNode(t: Quadtree, x0: number, y0: number, s: number): number {
  if (t.used >= t.body.length) return -1; // capacidade estourada → agrega no pai
  const i = t.used++;
  t.x0[i] = x0;
  t.y0[i] = y0;
  t.s[i] = s;
  t.cx[i] = 0;
  t.cy[i] = 0;
  t.m[i] = 0;
  t.body[i] = -1;
  const k = i * 4;
  t.child[k] = -1;
  t.child[k + 1] = -1;
  t.child[k + 2] = -1;
  t.child[k + 3] = -1;
  return i;
}

function isLeaf(t: Quadtree, node: number): boolean {
  const k = node * 4;
  return t.child[k] === -1 && t.child[k + 1] === -1 && t.child[k + 2] === -1 && t.child[k + 3] === -1;
}

function childIndex(t: Quadtree, node: number, x: number, y: number): number {
  const half = t.s[node] / 2;
  return (x >= t.x0[node] + half ? 1 : 0) + (y >= t.y0[node] + half ? 2 : 0);
}

function childNode(t: Quadtree, node: number, q: number): number {
  const existing = t.child[node * 4 + q];
  if (existing >= 0) return existing;
  const half = t.s[node] / 2;
  const created = newNode(t, t.x0[node] + (q & 1 ? half : 0), t.y0[node] + (q & 2 ? half : 0), half);
  if (created >= 0) t.child[node * 4 + q] = created;
  return created;
}

function insert(
  t: Quadtree,
  node: number,
  b: number,
  xs: Float64Array,
  ys: Float64Array,
  mass: Float64Array,
  depth: number,
): void {
  t.m[node] += mass[b];
  t.cx[node] += xs[b] * mass[b];
  t.cy[node] += ys[b] * mass[b];
  if (t.body[node] === -1 && isLeaf(t, node)) {
    t.body[node] = b;
    return;
  }
  if (depth >= MAX_DEPTH) {
    t.body[node] = -2; // corpos coincidentes: agrega pelo centro de massa
    return;
  }
  if (t.body[node] >= 0) {
    const old = t.body[node];
    t.body[node] = -2;
    pushDown(t, node, old, xs, ys, mass, depth);
  }
  pushDown(t, node, b, xs, ys, mass, depth);
}

function pushDown(
  t: Quadtree,
  node: number,
  b: number,
  xs: Float64Array,
  ys: Float64Array,
  mass: Float64Array,
  depth: number,
): void {
  const c = childNode(t, node, childIndex(t, node, xs[b], ys[b]));
  if (c >= 0) insert(t, c, b, xs, ys, mass, depth + 1);
  // c === -1 (capacidade estourada): corpo já está no COM de `node` (agregado).
}

function finalizeCom(t: Quadtree): void {
  for (let i = 0; i < t.used; i++) {
    if (t.m[i] > 0) {
      t.cx[i] /= t.m[i];
      t.cy[i] /= t.m[i];
    }
  }
}

function boundsSquare(n: number, xs: Float64Array, ys: Float64Array): [number, number, number] {
  let minx = Infinity;
  let miny = Infinity;
  let maxx = -Infinity;
  let maxy = -Infinity;
  for (let i = 0; i < n; i++) {
    if (xs[i] < minx) minx = xs[i];
    if (xs[i] > maxx) maxx = xs[i];
    if (ys[i] < miny) miny = ys[i];
    if (ys[i] > maxy) maxy = ys[i];
  }
  return [minx, miny, Math.max(maxx - minx, maxy - miny, 1) * 1.01 + 1];
}

function accumForce(
  t: Quadtree,
  stack: Int32Array,
  i: number,
  xs: Float64Array,
  ys: Float64Array,
  mass: Float64Array,
  gc: number,
  maxForce: number,
  fx: Float64Array,
  fy: Float64Array,
): void {
  let top = 0;
  stack[top++] = 0; // raiz
  while (top > 0) {
    const node = stack[--top];
    if (t.m[node] === 0) continue;
    const leaf = isLeaf(t, node);
    if (leaf && t.body[node] === i) continue; // o próprio nó
    let dx = xs[i] - t.cx[node];
    let dy = ys[i] - t.cy[node];
    let d2 = dx * dx + dy * dy;
    if (!leaf && t.s[node] * t.s[node] >= THETA2 * d2) {
      const k = node * 4;
      if (t.child[k] >= 0) stack[top++] = t.child[k];
      if (t.child[k + 1] >= 0) stack[top++] = t.child[k + 1];
      if (t.child[k + 2] >= 0) stack[top++] = t.child[k + 2];
      if (t.child[k + 3] >= 0) stack[top++] = t.child[k + 3];
      continue;
    }
    if (d2 < JITTER2) {
      const ang = i * 2.3999;
      dx = Math.cos(ang);
      dy = Math.sin(ang);
      d2 = JITTER2;
    }
    const d = Math.sqrt(d2);
    let f = (gc * mass[i] * t.m[node]) / d2;
    if (f > maxForce) f = maxForce;
    fx[i] += (dx / d) * f;
    fy[i] += (dy / d) * f;
  }
}

/**
 * Acumula a repulsão n-body em fx/fy usando Barnes-Hut (O(n log n)). Só a força-base
 * (gc·mᵢ·mⱼ/d², limitada por maxForce) — avoidOverlap fica no grid de distância mínima.
 * @example barnesHutRepulsion(n, xs, ys, mass, fx, fy, 6000, 1200)
 */
export function barnesHutRepulsion(
  n: number,
  xs: Float64Array,
  ys: Float64Array,
  mass: Float64Array,
  fx: Float64Array,
  fy: Float64Array,
  gc: number,
  maxForce: number,
): void {
  if (n < 2) return;
  const [x0, y0, size] = boundsSquare(n, xs, ys);
  const t = makeTree(6 * n + 128);
  newNode(t, x0, y0, size); // raiz = nó 0
  for (let b = 0; b < n; b++) insert(t, 0, b, xs, ys, mass, 0);
  finalizeCom(t);
  const stack = new Int32Array(4 * MAX_DEPTH + 16);
  for (let i = 0; i < n; i++) accumForce(t, stack, i, xs, ys, mass, gc, maxForce, fx, fy);
}

/**
 * Resolve a distância mínima (anti-sobreposição) com um grid espacial: cada nó só é
 * comparado com os das 9 células vizinhas (O(n) com densidade limitada). Muta px/py in
 * place, distribuindo a separação por massa e respeitando nós fixos — igual ao passo
 * exato, mas sem o laço O(n²).
 * @example resolveMinGapGrid(n, px, py, radius, mass, fixed, 10)
 */
export function resolveMinGapGrid(
  n: number,
  px: Float64Array,
  py: Float64Array,
  radius: Float64Array,
  mass: Float64Array,
  fixed: Uint8Array,
  minGap: number,
): void {
  let maxR = 0;
  for (let i = 0; i < n; i++) if (radius[i] > maxR) maxR = radius[i];
  const cell = 2 * maxR + minGap + 1;
  const buckets = new Map<string, number[]>();
  const cellKey = (i: number): string => `${Math.floor(px[i] / cell)},${Math.floor(py[i] / cell)}`;
  for (let i = 0; i < n; i++) {
    const key = cellKey(i);
    const arr = buckets.get(key);
    if (arr) arr.push(i);
    else buckets.set(key, [i]);
  }
  for (let i = 0; i < n; i++) {
    const gx = Math.floor(px[i] / cell);
    const gy = Math.floor(py[i] / cell);
    for (let ox = -1; ox <= 1; ox++) {
      for (let oy = -1; oy <= 1; oy++) {
        const arr = buckets.get(`${gx + ox},${gy + oy}`);
        if (arr) separatePairs(i, arr, px, py, radius, mass, fixed, minGap);
      }
    }
  }
}

function separatePairs(
  i: number,
  arr: number[],
  px: Float64Array,
  py: Float64Array,
  radius: Float64Array,
  mass: Float64Array,
  fixed: Uint8Array,
  minGap: number,
): void {
  for (const j of arr) {
    if (j <= i) continue; // cada par uma vez
    const dx = px[j] - px[i];
    const dy = py[j] - py[i];
    const minD = radius[i] + radius[j] + minGap;
    const dist2 = dx * dx + dy * dy;
    if (dist2 >= minD * minD) continue;
    const dist = Math.sqrt(dist2) || 1e-4;
    const overlap = minD - dist;
    const ux = dx / dist;
    const uy = dy / dist;
    const [wi, wj] = separationWeights(fixed[i], fixed[j], mass[i], mass[j]);
    px[i] -= ux * overlap * wi;
    py[i] -= uy * overlap * wi;
    px[j] += ux * overlap * wj;
    py[j] += uy * overlap * wj;
  }
}

// Distribui a separação: nó mais pesado se move menos; nó fixo é imóvel (o outro
// absorve tudo). Espelha exatamente a lógica do passo exato.
function separationWeights(fi: number, fj: number, mi: number, mj: number): [number, number] {
  if (fi && fj) return [0, 0];
  if (fi) return [0, 1];
  if (fj) return [1, 0];
  return [mj / (mi + mj), mi / (mi + mj)];
}
