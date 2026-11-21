// Cache local de um baralho aberto — para reabri-lo instantaneamente
// (stale-while-revalidate). Diferente do cache da listagem, este é por baralho: a
// chave leva o id. Sobre o CacheStore unificado; a checagem de forma (accept) faz
// um payload defasado virar miss em vez de quebrar a tela.
import type { BaralhoDetail } from "../../domain/baralho.types";
import { cacheStore } from "../../../cache/infra/local-cache-store";
import type { CacheSlot } from "../../../cache/domain/cache-store";
import { getOfflineAccountScope } from "../../infra/offline-deck-library";

// v2 = cartões passaram a ter conceitosConectados; um payload v1 não tem o campo.
// Mudou a forma de BaralhoDetail? Vire a versão.
const VERSION = 2;

// O cache é uma fronteira não confiável: virar a versão é o mecanismo principal,
// mas depende de alguém lembrar — a forma também é conferida antes de usar.
function isUsable(parsed: BaralhoDetail): boolean {
  if (!parsed || !Array.isArray(parsed.cards)) return false;
  return parsed.cards.every((card) => Array.isArray(card.conceitosConectados));
}

function slotOf(baralhoId: string, scope: string): CacheSlot<BaralhoDetail> {
  return cacheStore.slot({
    key: `baralho-detail.${scope}.${baralhoId}`,
    version: VERSION,
    accept: isUsable,
    revive: (b): BaralhoDetail => ({ ...b, dataCriacao: new Date(b.dataCriacao) }),
  });
}

export function loadCachedBaralho(baralhoId: string, scope: string | null = getOfflineAccountScope()): BaralhoDetail | null {
  return scope ? slotOf(baralhoId, scope).read() : null;
}

export function saveCachedBaralho(baralho: BaralhoDetail, scope: string | null = getOfflineAccountScope()): void {
  if (scope) slotOf(baralho.id, scope).write(baralho);
}

/** Esquece o baralho — usado ao excluí-lo, para o cache não ressuscitar um fantasma. */
export function forgetCachedBaralho(baralhoId: string): void {
  const scope = getOfflineAccountScope();
  if (scope) slotOf(baralhoId, scope).invalidate();
}
