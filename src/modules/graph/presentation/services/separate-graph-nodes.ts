import type { PhysicsNode } from "./graph-physics.service";

type Bounds = { x: number; y: number; halfWidth: number; halfHeight: number };
type OccupiedCells = Map<string, Bounds[]>;

function nodeBounds(node: PhysicsNode): Bounds {
  return { x: node.x, y: node.y, halfWidth: (node.width ?? 60) / 2, halfHeight: (node.height ?? 40) / 2 };
}

function cellFor(x: number, y: number, size: number): [number, number] {
  return [Math.floor(x / size), Math.floor(y / size)];
}

function isClear(candidate: Bounds, cells: OccupiedCells, size: number, gap: number): boolean {
  const [column, row] = cellFor(candidate.x, candidate.y, size);
  for (let offset = 0; offset < 9; offset++) {
    const x = column + offset % 3 - 1;
    const y = row + Math.floor(offset / 3) - 1;
    const bucket = cells.get(`${x},${y}`);
    if (bucket?.some((other) => intersects(candidate, other, gap))) return false;
  }
  return true;
}

function intersects(left: Bounds, right: Bounds, gap: number): boolean {
  return Math.abs(left.x - right.x) < left.halfWidth + right.halfWidth + gap
    && Math.abs(left.y - right.y) < left.halfHeight + right.halfHeight + gap;
}

function findClearPosition(bounds: Bounds, cells: OccupiedCells, size: number, gap: number): Bounds {
  if (isClear(bounds, cells, size, gap)) return bounds;
  for (let radius = Math.max(8, size / 5); ; radius *= 1.5) {
    const placed = searchRing(bounds, radius, cells, size, gap);
    if (placed) return placed;
  }
}

const directions = Array.from({ length: 16 }, (_, i) => ({
  x: Math.cos(i * Math.PI / 8), y: Math.sin(i * Math.PI / 8),
}));

function searchRing(bounds: Bounds, radius: number, cells: OccupiedCells, size: number, gap: number): Bounds | undefined {
  for (const direction of directions) {
    const candidate = { ...bounds, x: bounds.x + radius * direction.x, y: bounds.y + radius * direction.y };
    if (isClear(candidate, cells, size, gap)) return candidate;
  }
  return undefined;
}

/** Places resting nodes in free space, e.g. separateGraphNodes(layout, 10).
 * Already clear nodes keep their position, and each placement is checked against all prior bounds.
 */
export function separateGraphNodes<T extends PhysicsNode>(nodes: T[], minimumGap = 10): T[] {
  const gap = Math.max(0, minimumGap);
  const size = nodes.reduce((max, node) => Math.max(max, node.width ?? 60, node.height ?? 40), 1) + gap;
  const cells: OccupiedCells = new Map();
  let moved = false;
  const result = nodes.map((node) => {
    const bounds = nodeBounds(node);
    const placed = findClearPosition(bounds, cells, size, gap);
    const [column, row] = cellFor(placed.x, placed.y, size);
    const key = `${column},${row}`;
    const bucket = cells.get(key);
    if (bucket) bucket.push(placed);
    else cells.set(key, [placed]);
    if (bounds === placed) return node;
    moved = true;
    return { ...node, x: placed.x, y: placed.y, vx: 0, vy: 0 };
  });
  return moved ? result : nodes;
}
