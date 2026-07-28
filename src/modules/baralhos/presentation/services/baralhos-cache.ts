// Cache local da listagem de baralhos — para reabrir a página instantaneamente
// (stale-while-revalidate): mostra o último payload na hora e revalida no backend
// em segundo plano. A listagem é filtrada no cliente, então é um snapshot único
// (sem chave por filtro). Agora sobre o CacheStore unificado (mesmo mecanismo do
// resto do app); mutações de baralho invalidam a tag BARALHOS_TAG.
import type { BaralhoItem } from "../../domain/baralho.types";
import { cacheStore } from "../../../cache/infra/local-cache-store";
import type { CacheSlot } from "../../../cache/domain/cache-store";

// Tag da área "baralhos": criar/renomear/apagar/mexer nos cards invalida.
export const BARALHOS_TAG = "baralhos";

// JSON serializa Date como string; a listagem ordena por data de criação, então ela
// volta a ser Date na leitura.
function reviveBaralho(baralho: BaralhoItem): BaralhoItem {
  return { ...baralho, dataCriacao: new Date(baralho.dataCriacao) };
}

const slot: CacheSlot<BaralhoItem[]> = cacheStore.slot({
  key: "baralhos-list",
  version: 1,
  tags: [BARALHOS_TAG],
  revive: (items): BaralhoItem[] => items.map(reviveBaralho),
});

export function loadCachedBaralhos(): BaralhoItem[] | null {
  return slot.read();
}

export function saveCachedBaralhos(baralhos: BaralhoItem[]): void {
  slot.write(baralhos);
}

/** Invalida a listagem cacheada — chamar após criar/renomear/apagar um baralho. */
export function invalidateBaralhosList(): void {
  cacheStore.invalidateTag(BARALHOS_TAG);
}
