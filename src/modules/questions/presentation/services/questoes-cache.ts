// Cache local da listagem de questões — para reabrir a página instantaneamente
// (stale-while-revalidate). A lista é filtrada no cliente, então é um snapshot
// único. Sobre o CacheStore unificado.
import type { QuestaoListItem } from "../../domain/questao.types";
import { cacheStore } from "../../../cache/infra/local-cache-store";
import type { CacheSlot } from "../../../cache/domain/cache-store";

// Tag da área "questions": criar/apagar/editar questão invalida.
export const QUESTOES_TAG = "questions";

// O cache é uma fronteira não confiável: um payload de formato antigo vira miss
// (cache vazio) em vez de quebrar a tela — foi assim que o baralho quebrou.
function isUsable(parsed: QuestaoListItem[]): boolean {
  if (!Array.isArray(parsed)) return false;
  return parsed.every((q) => Array.isArray(q.conceitosConectados));
}

const slot: CacheSlot<QuestaoListItem[]> = cacheStore.slot({
  key: "questoes-list",
  version: 1,
  tags: [QUESTOES_TAG],
  accept: isUsable,
});

export function loadCachedQuestoes(): QuestaoListItem[] | null {
  return slot.read();
}

export function saveCachedQuestoes(questoes: QuestaoListItem[]): void {
  slot.write(questoes);
}

/** Invalida a listagem cacheada — chamar após criar/apagar/editar uma questão. */
export function invalidateQuestoesList(): void {
  cacheStore.invalidateTag(QUESTOES_TAG);
}
