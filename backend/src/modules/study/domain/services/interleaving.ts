// Intercala cartas para variar o conceito (no máx. maxPerConcept seguidas).
// Domínio puro. Determinístico: o Map preserva a ordem de inserção dos conceitos.

type WithConcept = { conceito: string | null };

function groupByConcept<T extends WithConcept>(cards: T[]): Map<string, T[]> {
  const groups = new Map<string, T[]>();
  for (const card of cards) {
    const key = card.conceito ?? '';
    const bucket = groups.get(key);
    if (bucket) bucket.push(card);
    else groups.set(key, [card]);
  }
  return groups;
}

// Pode puxar deste conceito sem exceder maxPerConcept nas últimas cartas?
function canPull<T extends WithConcept>(
  result: T[],
  concept: string,
  queue: T[],
  maxPerConcept: number,
): boolean {
  if (queue.length === 0) return false;
  const recent = result.slice(-maxPerConcept).filter((c) => (c.conceito ?? '') === concept).length;
  return recent < maxPerConcept;
}

// Uma passada puxando até uma carta de cada conceito elegível. Retorna se puxou alguma.
function pullRound<T extends WithConcept>(
  groups: Map<string, T[]>,
  result: T[],
  maxPerConcept: number,
): boolean {
  let pulled = false;
  for (const [concept, queue] of groups) {
    if (!canPull(result, concept, queue, maxPerConcept)) continue;
    result.push(queue.shift()!);
    pulled = true;
  }
  return pulled;
}

// Fallback: nenhum conceito elegível → empurra a primeira carta restante (repete).
function pullForced<T extends WithConcept>(groups: Map<string, T[]>, result: T[]): void {
  for (const queue of groups.values()) {
    if (queue.length === 0) continue;
    result.push(queue.shift()!);
    return;
  }
}

/**
 * Reordena as cartas para que não haja mais de `maxPerConcept` do mesmo conceito
 * seguidas, quando houver alternativa. Preserva todas as cartas.
 * @example applyInterleaving([a1, a2, b1], 1) // [a1, b1, a2]
 */
export function applyInterleaving<T extends WithConcept>(cards: T[], maxPerConcept = 2): T[] {
  if (cards.length <= maxPerConcept) return [...cards];
  const groups = groupByConcept(cards);
  const result: T[] = [];
  while (result.length < cards.length) {
    if (!pullRound(groups, result, maxPerConcept)) pullForced(groups, result);
  }
  return result;
}
