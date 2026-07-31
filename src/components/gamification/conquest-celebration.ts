// Detecta conceitos recém-dominados desde a última vez que o usuário viu — para
// celebrar o momento uma vez, não a cada carga. O "já visto" fica no localStorage
// (do aparelho). Parte pura testável + os acessos ao disco.

const SEEN_KEY = "neuralabs.conquered-seen";

/** Ids dominados agora que não estavam na lista já vista. */
export function newlyDominated(currentIds: string[], seenIds: string[]): string[] {
  const seen = new Set(seenIds);
  return currentIds.filter((id) => !seen.has(id));
}

// Se já há um registro salvo. Na PRIMEIRA vez semeamos em silêncio — senão
// celebraríamos de uma vez todos os conceitos já dominados.
export function hasSeenRecord(): boolean {
  try {
    return localStorage.getItem(SEEN_KEY) !== null;
  } catch {
    return false;
  }
}

export function loadSeenConquered(): string[] {
  try {
    const raw = localStorage.getItem(SEEN_KEY);
    const parsed: unknown = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed.filter((x): x is string => typeof x === "string") : [];
  } catch {
    return [];
  }
}

export function saveSeenConquered(ids: string[]): void {
  try {
    localStorage.setItem(SEEN_KEY, JSON.stringify(ids));
  } catch {
    // sem persistência (modo privado): pode recelebrar nesta sessão — inofensivo.
  }
}
