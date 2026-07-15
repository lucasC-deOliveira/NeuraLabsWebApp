import { useEffect, useState } from "react";
import { isDesktop, desktop } from "@/lib/vault-bridge";
import { readAllVaultNodes, graphVaultDir } from "@/lib/vault-sync";
import { readSrsLog, isDue } from "@/lib/srs-local";
import type { VaultNode } from "@/lib/vault-format";
import type { PropertiesNode, DeckStats } from "../components/properties/properties-panel.types";

type ScheduleMap = Record<string, unknown>;

// Flashcard ids CONTEM-linked to the deck (baralho) that actually resolve to a
// FLASHCARD node in the vault. Pure.
export function deckFlashcardIds(baralho: VaultNode, nodeById: Map<string, VaultNode>): string[] {
  return baralho.relacoes
    .filter((r) => r.rel === "CONTEM")
    .map((r) => r.alvo)
    .filter((id) => nodeById.get(id)?.tipo === "FLASHCARD");
}

// Counts how many of the deck's cards are new (no schedule) vs due for review. Pure.
export function countDeckSrs(fcIds: string[], schedule: ScheduleMap): { novos: number; paraRevisar: number } {
  let novos = 0;
  let paraRevisar = 0;
  for (const id of fcIds) {
    const s = schedule[id];
    if (!s) novos++;
    else if (isDue(s as Parameters<typeof isDue>[0])) paraRevisar++;
  }
  return { novos, paraRevisar };
}

async function reviewCounts(
  fcIds: string[],
  grafoId: string,
  grafoNome: string,
): Promise<{ novos: number; paraRevisar: number }> {
  if (!isDesktop()) return { novos: fcIds.length, paraRevisar: 0 };
  const vaultDir = await desktop.vault.getPath().catch(() => null);
  if (!vaultDir) return { novos: fcIds.length, paraRevisar: 0 };
  const srsLog = await readSrsLog(vaultDir, graphVaultDir(vaultDir, grafoId, grafoNome));
  return countDeckSrs(fcIds, srsLog.schedule);
}

async function loadDeckStats(nodeId: string, grafoId: string, grafoNome: string): Promise<DeckStats | null> {
  const vaultNodes = await readAllVaultNodes(grafoId, grafoNome);
  const nodeById = new Map(vaultNodes.map((n) => [n.id, n]));
  const baralho = nodeById.get(nodeId);
  if (!baralho) return null;
  const fcIds = deckFlashcardIds(baralho, nodeById);
  const { novos, paraRevisar } = await reviewCounts(fcIds, grafoId, grafoNome);
  return { total: fcIds.length, novos, paraRevisar };
}

// Loads the deck (baralho) SRS stats from the local vault. Result is DERIVED
// against the current node id so the effect never sets state synchronously.
export function useDeckStats(
  node: PropertiesNode | null,
  grafoId: string | undefined,
  grafoNome: string | undefined,
): DeckStats | null {
  const [loaded, setLoaded] = useState<{ id: string; stats: DeckStats | null }>({ id: "", stats: null });
  const isBaralho = node?.tipoReal === "BARALHO";
  const nodeId = node?.id ?? null;

  useEffect(() => {
    if (!isBaralho || !nodeId || !grafoId || !grafoNome) return;
    let ignore = false;
    loadDeckStats(nodeId, grafoId, grafoNome)
      .then((s): void => { if (!ignore) setLoaded({ id: nodeId, stats: s }); })
      .catch((): void => { if (!ignore) setLoaded({ id: nodeId, stats: null }); });
    return (): void => { ignore = true; };
  }, [isBaralho, nodeId, grafoId, grafoNome]);

  return loaded.id === nodeId ? loaded.stats : null;
}
