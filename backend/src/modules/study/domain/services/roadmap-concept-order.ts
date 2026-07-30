// Passo da trilha do roadmap: { nodeId } (= conceitoId), já ordenado.
interface TrilhaStep {
  nodeId: string;
}

function pushStep(id: unknown, seen: Set<string>, order: string[]): void {
  if (typeof id === 'string' && !seen.has(id)) {
    seen.add(id);
    order.push(id);
  }
}

function collectSteps(itens: unknown, seen: Set<string>, order: string[]): void {
  const steps = (itens as TrilhaStep[] | null) ?? [];
  for (const step of steps) pushStep(step.nodeId, seen, order);
}

/**
 * Concatena as trilhas de vários grafos numa ordem única de conceitos, sem repetir
 * (a 1ª aparição vence). Usado pelas queries de roadmap do plano (novos/questões/
 * contexto) agora que o plano tem VÁRIOS grafos como conteúdo, não um só.
 * @example dedupeConceptOrder([{ itens: [{ nodeId: 'c1' }] }, { itens: [{ nodeId: 'c1' }, { nodeId: 'c2' }] }]) // ['c1','c2']
 */
export function dedupeConceptOrder(rows: { itens: unknown }[]): string[] {
  const seen = new Set<string>();
  const order: string[] = [];
  for (const row of rows) collectSteps(row.itens, seen, order);
  return order;
}
