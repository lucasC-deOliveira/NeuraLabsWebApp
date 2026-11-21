function matchingVaultProjectionEntry<T extends object>(current: T, incoming: T): boolean {
  const keys = new Set([...Object.keys(current), ...Object.keys(incoming)] as Array<keyof T>);
  return [...keys].every((key) => Object.is(current[key], incoming[key]));
}

/** Reuses the canvas input when the same Markdown mutation is reported twice.
 * @example setNodes((current) => keepEquivalentVaultProjection(current, refreshed))
 */
export function keepEquivalentVaultProjection<T extends object>(current: T[], incoming: T[]): T[] {
  if (current.length !== incoming.length) return incoming;
  const equivalent = current.every((entry, index) => matchingVaultProjectionEntry(entry, incoming[index]));
  return equivalent ? current : incoming;
}
