// Registro "já visto" por chave no localStorage + diff do que é novo. Reusado pelas
// celebrações (conquista de conceitos, novo território) para festejar cada item uma
// vez só. Parte pura testável (newItems) + os acessos ao disco.

/** Ids presentes agora que não estavam na lista já vista. */
export function newItems(currentIds: string[], seenIds: string[]): string[] {
  const seen = new Set(seenIds);
  return currentIds.filter((id) => !seen.has(id));
}

// Se já há um registro salvo. Na PRIMEIRA vez semeamos em silêncio — senão
// celebraríamos de uma vez tudo o que já estava lá.
export function hasSeenRecord(key: string): boolean {
  try {
    return localStorage.getItem(key) !== null;
  } catch {
    return false;
  }
}

export function loadSeen(key: string): string[] {
  try {
    const raw = localStorage.getItem(key);
    const parsed: unknown = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed.filter((x): x is string => typeof x === "string") : [];
  } catch {
    return [];
  }
}

export function saveSeen(key: string, ids: string[]): void {
  try {
    localStorage.setItem(key, JSON.stringify(ids));
  } catch {
    // sem persistência (modo privado): pode recelebrar nesta sessão — inofensivo.
  }
}
