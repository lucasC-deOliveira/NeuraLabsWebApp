// Cache local da listagem de baralhos — para reabrir a página instantaneamente
// (stale-while-revalidate): mostra o último payload na hora e revalida no backend
// em segundo plano. A listagem é filtrada no cliente, então é um snapshot único
// (sem chave por filtro). Agora sobre o CacheStore unificado (mesmo mecanismo do
// resto do app); mutações de baralho invalidam o snapshot da conta ativa.
import type { BaralhoItem } from "../../domain/baralho.types";
import { cacheStore } from "../../../cache/infra/local-cache-store";
import type { CacheSlot } from "../../../cache/domain/cache-store";
import { getOfflineAccountScope } from "../../infra/offline-deck-library";

// JSON serializa Date como string; a listagem ordena por data de criação, então ela
// volta a ser Date na leitura.
function reviveBaralho(baralho: BaralhoItem): BaralhoItem {
  return { ...baralho, dataCriacao: new Date(baralho.dataCriacao) };
}

function scopedListSlot(scope: string): CacheSlot<BaralhoItem[]> {
  return cacheStore.slot({
    key: `baralhos-list.${scope}`,
    version: 1,
    revive: (items): BaralhoItem[] => items.map(reviveBaralho),
  });
}

export function loadCachedBaralhos(scope: string | null = getOfflineAccountScope()): BaralhoItem[] | null {
  return scope ? scopedListSlot(scope).read() : null;
}

export function saveCachedBaralhos(baralhos: BaralhoItem[], scope: string | null = getOfflineAccountScope()): void {
  if (scope) scopedListSlot(scope).write(baralhos);
}

/** Invalida a listagem cacheada — chamar após criar/renomear/apagar um baralho. */
export function invalidateBaralhosList(): void {
  const scope = getOfflineAccountScope();
  if (scope) scopedListSlot(scope).invalidate();
}
