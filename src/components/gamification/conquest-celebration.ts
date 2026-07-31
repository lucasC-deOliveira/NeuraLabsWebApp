// Detecta conceitos recém-dominados desde a última vez que o usuário viu — para
// celebrar o momento uma vez, não a cada carga. A mecânica genérica (diff + disco)
// vive em seen-store; aqui só a chave e os nomes do domínio.
import { newItems, hasSeenRecord as hasSeen, loadSeen, saveSeen } from "./seen-store";

const SEEN_KEY = "neuralabs.conquered-seen";

/** Ids dominados agora que não estavam na lista já vista. */
export function newlyDominated(currentIds: string[], seenIds: string[]): string[] {
  return newItems(currentIds, seenIds);
}

export function hasSeenRecord(): boolean {
  return hasSeen(SEEN_KEY);
}

export function loadSeenConquered(): string[] {
  return loadSeen(SEEN_KEY);
}

export function saveSeenConquered(ids: string[]): void {
  saveSeen(SEEN_KEY, ids);
}
