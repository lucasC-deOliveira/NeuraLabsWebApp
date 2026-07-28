// Cache local da listagem de provas — para reabrir a página instantaneamente
// (stale-while-revalidate). A lista é filtrada no cliente, então é um snapshot
// único (sem chave por filtro). Sobre o CacheStore unificado; o cache de UMA prova
// aberta é outro, por id (prova-detail-cache).
import type { ProvaListItem } from "../../domain/prova.types";
import { cacheStore } from "../../../cache/infra/local-cache-store";
import type { CacheSlot } from "../../../cache/domain/cache-store";

// Tag da área "provas": criar/apagar/editar prova invalida.
export const PROVAS_TAG = "provas";

// O cache é uma fronteira não confiável: um payload de formato antigo vira miss
// (cache vazio) em vez de quebrar a tela — foi assim que o baralho quebrou.
function isUsable(parsed: ProvaListItem[]): boolean {
  if (!Array.isArray(parsed)) return false;
  return parsed.every((p) => typeof p.id === "string" && typeof p.totalQuestoes === "number");
}

const slot: CacheSlot<ProvaListItem[]> = cacheStore.slot({
  key: "provas-list",
  version: 1,
  tags: [PROVAS_TAG],
  accept: isUsable,
});

export function loadCachedProvas(): ProvaListItem[] | null {
  return slot.read();
}

export function saveCachedProvas(provas: ProvaListItem[]): void {
  slot.write(provas);
}

/** Invalida a listagem cacheada — chamar após criar/apagar/editar uma prova. */
export function invalidateProvasList(): void {
  cacheStore.invalidateTag(PROVAS_TAG);
}
