// Intercala cartas para variar o conceito (no máx. maxPerConcept seguidas).
export function applyInterleaving<T extends { conceito: string | null }>(cards: T[], maxPerConcept = 2): T[] {
  if (cards.length <= maxPerConcept) return [...cards];
  const remaining = new Map<string, T[]>();
  for (const card of cards) {
    const k = card.conceito ?? '';
    (remaining.get(k) ?? remaining.set(k, []).get(k)!).push(card);
  }
  const result: T[] = [];
  while (result.length < cards.length) {
    let pulled = false;
    for (const [concept, queue] of remaining) {
      const recentCount = result.slice(-maxPerConcept).filter((c) => (c.conceito ?? '') === concept).length;
      if (recentCount < maxPerConcept && queue.length > 0) {
        result.push(queue.shift()!);
        pulled = true;
      }
    }
    if (!pulled) {
      for (const [, queue] of remaining) {
        if (queue.length > 0) { result.push(queue.shift()!); break; }
      }
    }
  }
  return result;
}
