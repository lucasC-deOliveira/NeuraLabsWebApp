// Pure planning for node positioning: the frontend sends positions keyed by a
// "prefix:id" string (e.g. "conceito:abc"); this maps them to typed node updates,
// skipping unprefixed or unknown-prefix entries (only graph nodes carry positions).

export interface PositionUpdate {
  tipoNode: string;
  referenciaId: string;
  x: number;
  y: number;
}

export interface Point {
  x: number;
  y: number;
}

const PREFIX_TO_TYPE: Record<string, string> = {
  flashcard: 'FLASHCARD',
  nota: 'NOTA',
  assunto: 'ASSUNTO',
  topico: 'TOPICO',
  conceito: 'CONCEITO',
};

export function planPositionUpdates(positions: Record<string, Point>): PositionUpdate[] {
  const updates: PositionUpdate[] = [];
  for (const [key, point] of Object.entries(positions)) {
    const update = toPositionUpdate(key, point);
    if (update) updates.push(update);
  }
  return updates;
}

function toPositionUpdate(key: string, point: Point): PositionUpdate | null {
  if (!key.includes(':')) return null;
  const tipoNode = PREFIX_TO_TYPE[key.split(':')[0].toLowerCase()];
  if (!tipoNode) return null;
  const referenciaId = key.split(':').slice(1).join(':');
  return { tipoNode, referenciaId, x: point.x, y: point.y };
}
