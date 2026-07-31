// Detecta ASSUNTOS/TÓPICOS novos que entraram no mapa desde a última visita — para
// celebrar "novo território" uma vez. Mesma mecânica da conquista (seen-store), com
// a chave própria do território.
import { newItems, hasSeenRecord as hasSeen, loadSeen, saveSeen } from "./seen-store";

const SEEN_KEY = "neuralabs.territory-seen";

/** Ids de território presentes agora que não estavam na lista já vista. */
export function newlyDiscovered(currentIds: string[], seenIds: string[]): string[] {
  return newItems(currentIds, seenIds);
}

export function hasSeenTerritory(): boolean {
  return hasSeen(SEEN_KEY);
}

export function loadSeenTerritory(): string[] {
  return loadSeen(SEEN_KEY);
}

export function saveSeenTerritory(ids: string[]): void {
  saveSeen(SEEN_KEY, ids);
}
