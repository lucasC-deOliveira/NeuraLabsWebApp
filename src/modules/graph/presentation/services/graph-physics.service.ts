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

import { barnesHutRepulsion, resolveMinGapGrid } from "./barnes-hut";

export type PhysicsNode = {
  id: string;
  x: number;
  y: number;
  vx?: number;
  vy?: number;
  width?: number;
  height?: number;
  parentId?: string;
  group?: string;
  /** raiz da árvore hierárquica (ASSUNTO) — usado pelas forças de cluster
   *  quando clusterBy === "hierarchy" para agrupar/separar por assunto */
  clusterId?: string;
  /** id do subtree em cada nível [0]=ASSUNTO [1]=TOPICO [2]=CONCEITO — usado
   *  pela repulsão de clusters aninhada (separa irmãos em cada nível) */
  subtreeIds?: (string | undefined)[];
  /** nó imóvel: a simulação nunca atualiza sua posição (Assunto-raiz no centro).
   *  Ele ainda exerce forças sobre os outros (âncora orbital), mas não se move. */
  fixed?: boolean;
};

export type PhysicsEdge = { source: string; target: string; peso?: number };

// parâmetros ajustáveis pelo usuário (modal de configurações do grafo).
// Nomes e papéis espelham o solver barnesHut do vis-network.
export type PhysicsMode = "default" | "cluster";

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
  /** força orbital hierárquica — mantém cada nó na órbita do seu nó pai;
   *  0 = desativado, valores típicos 0.04–0.12 */
  orbitalStrength?: number;
  /** modo cluster: atração de cada nó para o centróide do seu grupo;
   *  0 = desativado, valores típicos 0.08–0.20 */
  clusterStrength?: number;
  /** modo cluster: multiplicador da repulsão entre nós de grupos diferentes;
   *  1 = igual à repulsão normal, valores típicos 2–5 */
  interGroupRepulsion?: number;
  /** repulsão entre centróides de grupos — empurra o cluster inteiro como unidade;
   *  0 = desativado, valores típicos 5000–40000 */
  clusterRepulsion?: number;
  /** impede sobreposição dos bounding circles dos clusters (hard constraint pós-integração);
   *  false = desativado */
  avoidClusterOverlap?: boolean;
  /** distância mínima entre bordas de nós (hard constraint pós-integração);
   *  0 = desativado, valores típicos 5–40 px */
  minGap?: number;
  /** critério de agrupamento das forças de cluster:
   *  "group"     = agrupa por tipo de nó (todos os ASSUNTOs juntos, etc.)
   *  "hierarchy" = agrupa por clusterId (a raiz ASSUNTO da árvore) — separa
   *                assuntos distintos e puxa cada nó para o seu ASSUNTO. */
  clusterBy?: "group" | "hierarchy";
};

// Modo padrão = hierárquico: cada ASSUNTO é o centro de gravidade de uma árvore
// (tópicos orbitam o assunto, conceitos orbitam tópicos, comuns orbitam conceitos).
// A força orbital monta os anéis concêntricos; as forças de cluster (por clusterId)
// mantêm cada assunto coeso e separado dos demais.
export const DEFAULT_PHYSICS_OPTIONS: PhysicsOptions = {
  gravitationalConstant: 6000,
  centralGravity: 0.06,
  springLength: 200,
  springConstant: 0.018,
  damping: 0.55,
  avoidOverlap: 0.6,
  orbitalStrength: 0.08,
  // coesão desligada por padrão: a força orbital já ancora toda a árvore ao
  // assunto (folha→conceito→tópico→assunto), então o assunto é o centro natural.
  // A separação entre assuntos diferentes fica por conta da repulsão de clusters.
  clusterStrength: 0,
  interGroupRepulsion: 1,
  clusterRepulsion: 12000,
  avoidClusterOverlap: false,
  minGap: 10,
  clusterBy: "hierarchy",
};

// Modo cluster = agrupa por TIPO de nó (todos os assuntos juntos, todos os
// tópicos juntos, ...). Alternativa não-hierárquica, útil para ver a composição.
export const DEFAULT_CLUSTER_OPTIONS: PhysicsOptions = {
  gravitationalConstant: 2500,
  centralGravity: 0.08,
  springLength: 150,
  springConstant: 0.018,
  damping: 0.65,
  avoidOverlap: 0.7,
  orbitalStrength: 0,
  clusterStrength: 0.10,
  interGroupRepulsion: 2.5,
  clusterRepulsion: 15000,
  avoidClusterOverlap: true,
  minGap: 10,
  clusterBy: "group",
};

const TIMESTEP = 0.85; // passo de integração por frame
const MAX_VELOCITY = 16; // limite de velocidade por nó (evita "explosões")
const MAX_PAIR_FORCE = 1200; // limite da força de repulsão por par
const MIN_KINETIC = 0.10; // abaixo disto o nó é considerado parado
// Acima deste nº de nós, a repulsão O(n²) e a distância mínima O(n²) trocam pelas
// versões O(n log n)/O(n): Barnes-Hut (quadtree) + grid espacial. Abaixo, caminho exato.
const BARNES_HUT_MIN = 600;

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
    orbitalStrength = 0.08,
    clusterStrength = 0,
    interGroupRepulsion = 1,
    clusterRepulsion = 0,
    avoidClusterOverlap = false,
    minGap = 10,
    clusterBy = "group",
  } = options;

  const idx = new Map<string, number>();
  for (let i = 0; i < n; i++) idx.set(nodes[i].id, i);

  // Chave de agrupamento das forças de cluster. Em "hierarchy", agrupa pela raiz
  // ASSUNTO (clusterId); em "group", pelo tipo de nó. Cai no group quando o nó
  // não tem clusterId (ex.: hierarquia ainda não derivada).
  const clusterKeyOf = (node: T): string | undefined =>
    clusterBy === "hierarchy" ? (node.clusterId ?? node.group) : node.group;

  const useBarnesHut = n > BARNES_HUT_MIN;
  const fx = new Float64Array(n);
  const fy = new Float64Array(n);
  const mass = new Float64Array(n);
  const radius = new Float64Array(n);
  // Posições/fixos em arrays tipados: Barnes-Hut e o grid de distância mínima operam
  // sobre eles (só alocados no caminho grande).
  const xs = useBarnesHut ? new Float64Array(n) : null;
  const ys = useBarnesHut ? new Float64Array(n) : null;
  const fixedArr = useBarnesHut ? new Uint8Array(n) : null;

  let cx = 0;
  let cy = 0;
  for (let i = 0; i < n; i++) {
    const node = nodes[i];
    mass[i] = nodeMass(node);
    radius[i] = collisionRadius(node);
    cx += node.x;
    cy += node.y;
    if (xs) {
      xs[i] = node.x;
      ys![i] = node.y;
      fixedArr![i] = node.fixed ? 1 : 0;
    }
  }
  cx /= n;
  cy /= n;

  // Escala a repulsão inversamente com √n: grafos maiores têm GC menor automaticamente.
  // n=50 → ×1.0; n=100 → ×0.71; n=200 → ×0.5; n=400 → ×0.35
  const repulsionScale = 1 / Math.sqrt(Math.max(n, 50) / 50);
  const effectiveGC = gravitationalConstant * repulsionScale;

  // springLength escala com √n: grafos maiores têm arestas naturalmente mais longas.
  // n=50 → ×1.0; n=100 → ×1.41; n=200 → ×2.0; n=400 → ×2.83
  const effectiveSpringLength = springLength * Math.sqrt(Math.max(n, 50) / 50);

  // ── Repulsão entre nós. Grafo grande: Barnes-Hut O(n log n) (força-base; o
  // avoidOverlap/groupMul do par exato viram responsabilidade do grid de distância
  // mínima e das forças de cluster). Grafo pequeno: par-a-par exato O(n²).
  if (useBarnesHut && xs && ys) {
    barnesHutRepulsion(n, xs, ys, mass, fx, fy, effectiveGC, MAX_PAIR_FORCE);
  } else {
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
        const ki = clusterKeyOf(nodes[i]);
        const kj = clusterKeyOf(nodes[j]);
        const groupMul = (interGroupRepulsion > 1 && ki && kj && ki !== kj)
          ? interGroupRepulsion : 1;
        let force = (effectiveGC * mass[i] * mass[j] * groupMul) / (eff * eff);
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
  }

  // ── Molas nas arestas (atração para o comprimento ideal)
  for (const e of edges) {
    const i = idx.get(e.source);
    const j = idx.get(e.target);
    if (i === undefined || j === undefined || i === j) continue;
    const a = nodes[i];
    const b = nodes[j];
    const dx = b.x - a.x;
    const dy = b.y - a.y;
    let dist = Math.sqrt(dx * dx + dy * dy);
    if (dist < 1e-4) dist = 1e-4;
    const peso = e.peso && e.peso > 0 ? e.peso : 1;
    const k = springConstant * (0.5 + 0.5 * peso);
    const force = k * (dist - effectiveSpringLength);
    const ux = dx / dist;
    const uy = dy / dist;
    const fxv = ux * force;
    const fyv = uy * force;
    fx[i] += fxv;
    fy[i] += fyv;
    fx[j] -= fxv;
    fy[j] -= fyv;
  }

  // ── Força orbital hierárquica: cada nó é atraído para o anel ao redor do pai.
  // A "mola anular" empurra quando dist < target e puxa quando dist > target,
  // criando uma órbita estável. A repulsão entre irmãos (mesmo pai) os espalha
  // uniformemente ao redor — emergindo o padrão de anéis concêntricos.
  if (orbitalStrength > 0) {
    const ORBITAL_RADII: Record<string, number> = {
      ASSUNTO: 560,   // orbita o Assunto-raiz (anel mais externo)
      TOPICO: 300,    // orbita o ASSUNTO
      CONCEITO: 180,  // orbita o TOPICO
      // nós comuns orbitam o CONCEITO (anel mais interno, raio menor)
      NOTA: 115,
      FLASHCARD: 115,
      BARALHO: 115,
      TEXTO_BRUTO: 115,
      QUESTION: 115,
      PROVA: 115,
      GRAFO_REF: 115,
    };
    for (let i = 0; i < n; i++) {
      const child = nodes[i];
      if (!child.parentId) continue;
      const pi = idx.get(child.parentId);
      if (pi === undefined) continue;
      const parent = nodes[pi];

      const target = ORBITAL_RADII[child.group ?? ""] ?? 220;
      let dx = child.x - parent.x;
      let dy = child.y - parent.y;
      let d = Math.sqrt(dx * dx + dy * dy);
      if (d < 1e-4) {
        // sobreposto ao pai: separa numa direção estável via ângulo áureo
        const ang = (i * 2.3999) % (Math.PI * 2);
        dx = Math.cos(ang) * target;
        dy = Math.sin(ang) * target;
        d = target;
      }

      // deviation > 0 → longe demais → puxa (−dir)
      // deviation < 0 → perto demais → empurra (+dir)
      const f = orbitalStrength * (d - target);
      const ux = dx / d;
      const uy = dy / d;
      fx[i] -= ux * f;
      fy[i] -= uy * f;
      // pai reage levemente para não travar nos filhos
      fx[pi] += ux * f * 0.15;
      fy[pi] += uy * f * 0.15;
    }
  }

  // ── Força de cluster: atrai cada nó para o "âncora" do seu cluster.
  // Em "hierarchy" a âncora é a POSIÇÃO DO NÓ ASSUNTO (clusterId) — torna o
  // assunto o centro de gravidade real da árvore. Em "group" (ou sem nó âncora)
  // a âncora é o centróide do grupo. Combinada com a repulsão inter-cluster,
  // mantém cada assunto coeso e separado dos demais.
  if (clusterStrength > 0) {
    const groupSum = new Map<string, { x: number; y: number; count: number }>();
    for (const node of nodes) {
      const k = clusterKeyOf(node);
      if (!k) continue;
      if (!groupSum.has(k)) groupSum.set(k, { x: 0, y: 0, count: 0 });
      const s = groupSum.get(k)!;
      s.x += node.x; s.y += node.y; s.count++;
    }
    for (let i = 0; i < n; i++) {
      const k = clusterKeyOf(nodes[i]);
      if (!k) continue;
      // o próprio nó raiz/âncora não é puxado — ele É o centro
      if (clusterBy === "hierarchy" && nodes[i].id === k) continue;
      const s = groupSum.get(k);
      if (!s || s.count < 2) continue;
      // âncora: nó ASSUNTO (clusterId) se existir, senão centróide do grupo
      const anchor = clusterBy === "hierarchy" ? idx.get(k) : undefined;
      const ax = anchor !== undefined ? nodes[anchor].x : s.x / s.count;
      const ay = anchor !== undefined ? nodes[anchor].y : s.y / s.count;
      const dx = ax - nodes[i].x;
      const dy = ay - nodes[i].y;
      const dist = Math.hypot(dx, dy);
      if (dist < 1e-4) continue;
      const force = Math.min(clusterStrength * dist * 0.010, 18);
      fx[i] += (dx / dist) * force;
      fy[i] += (dy / dist) * force;
    }
  }

  // ── Evitar sobreposição de clusters: força proporcional ao overlap dos bounding circles.
  // Implementada como FORÇA (não constraint de posição) para que o damping a estabilize
  // naturalmente. Usa raio estimado (√count) para evitar o loop de feedback onde o raio
  // cresce junto com o afastamento, criando divergência infinita.
  if (avoidClusterOverlap) {
    const BLOB_PAD = 52;
    type ACInfo = { x: number; y: number; count: number; r: number; ids: number[] };
    const acmap = new Map<string, ACInfo>();
    for (let i = 0; i < n; i++) {
      const g = clusterKeyOf(nodes[i]);
      if (!g) continue;
      if (!acmap.has(g)) acmap.set(g, { x: 0, y: 0, count: 0, r: 0, ids: [] });
      const s = acmap.get(g)!;
      s.x += nodes[i].x; s.y += nodes[i].y; s.count++; s.ids.push(i);
    }
    for (const s of acmap.values()) {
      s.x /= s.count; s.y /= s.count;
      s.r = Math.sqrt(s.count) * 55 + BLOB_PAD; // raio fixo — não cresce com o afastamento
    }
    // só clusters reais (≥2 nós) participam — ver nota na repulsão de clusters
    const acArr = [...acmap.values()].filter((s) => s.count >= 2);
    for (let gi = 0; gi < acArr.length; gi++) {
      const ga = acArr[gi];
      for (let gj = gi + 1; gj < acArr.length; gj++) {
        const gb = acArr[gj];
        const dx = ga.x - gb.x, dy = ga.y - gb.y;
        const dist = Math.hypot(dx, dy) || 1;
        const minD = ga.r + gb.r;
        if (dist >= minD) continue; // sem sobreposição, sem força
        const force = Math.min((minD - dist) * 2.5, MAX_PAIR_FORCE);
        const ux = dx / dist, uy = dy / dist;
        const fa = force / ga.count, fb = force / gb.count;
        for (const i of ga.ids) { fx[i] += ux * fa; fy[i] += uy * fa; }
        for (const i of gb.ids) { fx[i] -= ux * fb; fy[i] -= uy * fb; }
      }
    }
  }

  // ── Repulsão entre centróides de grupos: empurra clusters inteiros uns dos outros.
  // Diferente de interGroupRepulsion (que age em pares individuais), esta força
  // age nos centróides e distribui igualmente para cada nó do grupo.
  //
  // Em "hierarchy" a repulsão é ANINHADA por nível, refletindo a estrutura
  // assunto → tópico → conceito: assuntos se separam entre si; tópicos se separam
  // entre si DENTRO do mesmo assunto; conceitos se separam DENTRO do mesmo tópico.
  // Cada subtree (grupo de um nível) só repele IRMÃOS — grupos que compartilham
  // o mesmo pai no nível acima. Assim cada cluster vira um cluster, subcluster e
  // minicluster, sem que conceitos de tópicos diferentes se misturem.
  // Em "group" mantém a repulsão plana por tipo de nó (modo cluster clássico).
  if (clusterRepulsion > 0) {
    type GroupInfo = { x: number; y: number; count: number; ids: number[]; parent: string };

    const repelSiblings = (gArr: GroupInfo[], scale: number) => {
      for (let gi = 0; gi < gArr.length; gi++) {
        const ga = gArr[gi];
        for (let gj = gi + 1; gj < gArr.length; gj++) {
          const gb = gArr[gj];
          if (ga.parent !== gb.parent) continue; // só irmãos (mesmo pai) se repelem
          const dx = ga.x - gb.x, dy = ga.y - gb.y;
          const dist = Math.hypot(dx, dy) || 1;
          const force = Math.min((clusterRepulsion * scale) / (dist * dist), MAX_PAIR_FORCE * 3);
          const ux = dx / dist, uy = dy / dist;
          const fa = force / ga.count, fb = force / gb.count;
          for (const i of ga.ids) { fx[i] += ux * fa; fy[i] += uy * fa; }
          for (const i of gb.ids) { fx[i] -= ux * fb; fy[i] -= uy * fb; }
        }
      }
    };

    const buildGroups = (keyOf: (i: number) => string | undefined, parentOf: (i: number) => string) => {
      const m = new Map<string, GroupInfo>();
      for (let i = 0; i < n; i++) {
        const k = keyOf(i);
        if (!k) continue;
        let g = m.get(k);
        if (!g) { g = { x: 0, y: 0, count: 0, ids: [], parent: parentOf(i) }; m.set(k, g); }
        g.x += nodes[i].x; g.y += nodes[i].y; g.count++; g.ids.push(i);
      }
      for (const s of m.values()) { s.x /= s.count; s.y /= s.count; }
      // ignora grupos unitários: redundante com a repulsão par-a-par normal.
      return [...m.values()].filter((s) => s.count >= 2);
    };

    if (clusterBy === "hierarchy") {
      // nível 0 (assuntos): todos se repelem (pai comum = raiz "")
      // nível 1 (tópicos): só dentro do mesmo assunto (pai = subtreeIds[0])
      // nível 2 (conceitos): só dentro do mesmo tópico (pai = subtreeIds[1])
      // força menor nos níveis profundos (clusters menores e mais próximos).
      const LEVEL_SCALE = [1, 0.5, 0.28];
      for (let level = 0; level <= 2; level++) {
        const groups = buildGroups(
          (i) => nodes[i].subtreeIds?.[level],
          (i) => (level === 0 ? "" : nodes[i].subtreeIds?.[level - 1] ?? ""),
        );
        repelSiblings(groups, LEVEL_SCALE[level]);
      }
    } else {
      // modo "group": repulsão plana por tipo de nó (todos os grupos são irmãos)
      const groups = buildGroups((i) => clusterKeyOf(nodes[i]), () => "");
      repelSiblings(groups, 1);
    }
  }

  // ── Gravidade central: mola fraca de cada nó para o centroide.
  // Nós filhos recebem gravidade muito menor — o orbital já os ancora no pai.
  if (centralGravity > 0) {
    for (let i = 0; i < n; i++) {
      const gFactor = nodes[i].parentId ? 0.2 : 1.0;
      fx[i] += (cx - nodes[i].x) * centralGravity * 0.05 * gFactor;
      fy[i] += (cy - nodes[i].y) * centralGravity * 0.05 * gFactor;
    }
  }

  // ── Cap de força total por nó: impede que a soma de muitos pares cause
  // aceleração explosiva (o problema "pipoca" em grafos grandes).
  const MAX_NODE_FORCE = 500;
  for (let i = 0; i < n; i++) {
    const totalF = Math.hypot(fx[i], fy[i]);
    if (totalF > MAX_NODE_FORCE) {
      const s = MAX_NODE_FORCE / totalF;
      fx[i] *= s;
      fy[i] *= s;
    }
  }

  // ── Passo 1: Integrar velocidade + posição em arrays de trabalho
  const retain = 1 - Math.max(0, Math.min(1, damping));
  const px  = new Float64Array(n); // posição x candidata
  const py  = new Float64Array(n); // posição y candidata
  const vxa = new Float64Array(n); // velocidade x após damping
  const vya = new Float64Array(n); // velocidade y após damping

  for (let i = 0; i < n; i++) {
    // nó fixo (Assunto-raiz): nunca se move — velocidade zerada.
    if (nodes[i].fixed) { vxa[i] = 0; vya[i] = 0; continue; }
    let vx = ((nodes[i].vx ?? 0) + (fx[i] / mass[i]) * TIMESTEP) * retain;
    let vy = ((nodes[i].vy ?? 0) + (fy[i] / mass[i]) * TIMESTEP) * retain;
    const speed = Math.hypot(vx, vy);
    if (speed > MAX_VELOCITY) { const s = MAX_VELOCITY / speed; vx *= s; vy *= s; }
    if (Math.abs(vx) < MIN_KINETIC && Math.abs(vy) < MIN_KINETIC) { vx = 0; vy = 0; }
    vxa[i] = vx;
    vya[i] = vy;
  }

  // ── Remoção da deriva translacional: zera a velocidade MÉDIA do sistema.
  // A reação orbital amortecida (pai recebe só 15% da ação) e a gravidade
  // central com gFactor diferente para filhos/raízes injetam força líquida; os
  // caps por nó e o zeramento por MIN_KINETIC também quebram a conservação de
  // momento. Sem isso o grafo derivava infinitamente. PORÉM, se há um nó FIXO
  // (Assunto-raiz), ele já é a âncora que impede a deriva — e remover a média
  // nesse caso cancelaria o movimento real dos nós (ex.: 1 móvel → média = ele
  // mesmo → para tudo). Então só removemos a deriva quando NÃO há âncora fixa.
  let hasFixed = false;
  for (let i = 0; i < n; i++) { if (nodes[i].fixed) { hasFixed = true; break; } }
  if (!hasFixed) {
    let mvx = 0, mvy = 0;
    for (let i = 0; i < n; i++) { mvx += vxa[i]; mvy += vya[i]; }
    mvx /= n; mvy /= n;
    for (let i = 0; i < n; i++) { vxa[i] -= mvx; vya[i] -= mvy; }
  }
  for (let i = 0; i < n; i++) {
    if (nodes[i].fixed) { px[i] = nodes[i].x; py[i] = nodes[i].y; continue; }
    px[i] = nodes[i].x + vxa[i] * TIMESTEP;
    py[i] = nodes[i].y + vya[i] * TIMESTEP;
  }

  // ── Passo 2: Resolução de restrição de distância mínima (hard constraint).
  // Após integrar, garante que nenhum par fique abaixo de radius[i]+radius[j]+MIN_GAP.
  // Grafo grande: grid espacial O(n) (só vizinhos); grafo pequeno: par-a-par O(n²).
  if (useBarnesHut && fixedArr) {
    resolveMinGapGrid(n, px, py, radius, mass, fixedArr, minGap);
  } else {
    for (let i = 0; i < n; i++) {
      for (let j = i + 1; j < n; j++) {
        const dx = px[j] - px[i];
        const dy = py[j] - py[i];
        const minD = radius[i] + radius[j] + minGap;
        const dist2 = dx * dx + dy * dy;
        if (dist2 >= minD * minD) continue;
        const dist = Math.sqrt(dist2) || 1e-4;
        const overlap = minD - dist; // quanto precisamos separar no total
        const ux = dx / dist;
        const uy = dy / dist;
        // distribuição por massa: nó mais pesado se move menos. Nó fixo (root) é
        // imóvel — o outro absorve toda a separação (massa infinita efetiva).
        const fi = nodes[i].fixed, fj = nodes[j].fixed;
        let wi: number, wj: number;
        if (fi && fj) { wi = 0; wj = 0; }
        else if (fi) { wi = 0; wj = 1; }
        else if (fj) { wi = 1; wj = 0; }
        else { wi = mass[j] / (mass[i] + mass[j]); wj = mass[i] / (mass[i] + mass[j]); }
        px[i] -= ux * overlap * wi;
        py[i] -= uy * overlap * wi;
        px[j] += ux * overlap * wj;
        py[j] += uy * overlap * wj;
      }
    }
  }

  // ── Passo 3: Construir array de saída; retornar mesma ref se nada mudou
  let moved = false;
  const next = nodes.map((node, i) => {
    const vx = vxa[i], vy = vya[i];
    const x = px[i],  y  = py[i];
    if (
      Math.abs(x - node.x) < 1e-4 &&
      Math.abs(y - node.y) < 1e-4 &&
      vx === (node.vx ?? 0) &&
      vy === (node.vy ?? 0)
    ) return node;
    moved = true;
    return { ...node, x, y, vx, vy };
  });

  return moved ? next : nodes;
}
