// Cache local de uma prova aberta — para reabri-la instantaneamente
// (stale-while-revalidate). Como o do baralho, é por prova: a chave leva o id.
// Sobre o CacheStore unificado; o accept faz um payload defasado virar miss.
import type { ProvaDetail } from "../../domain/prova.types";
import { cacheStore } from "../../../cache/infra/local-cache-store";
import type { CacheSlot } from "../../../cache/domain/cache-store";

// v1 nasceu já com conceitosConectados; o accept abaixo é a rede de segurança.
// Mudou a forma de ProvaDetail? Vire a versão.
const VERSION = 1;

// O cache é uma fronteira não confiável: um payload defasado vira miss em vez de
// quebrar a tela (foi assim que o baralho quebrou quando as tags chegaram).
function isUsable(parsed: ProvaDetail): boolean {
  if (!parsed || !Array.isArray(parsed.questoes)) return false;
  return parsed.questoes.every((q) => Array.isArray(q.conceitosConectados));
}

function slotOf(provaId: string): CacheSlot<ProvaDetail> {
  return cacheStore.slot({ key: `prova-detail.${provaId}`, version: VERSION, accept: isUsable });
}

export function loadCachedProva(provaId: string): ProvaDetail | null {
  return slotOf(provaId).read();
}

export function saveCachedProva(prova: ProvaDetail): void {
  slotOf(prova.id).write(prova);
}

/** Esquece a prova — usar ao excluí-la, para o cache não ressuscitar um fantasma. */
export function forgetCachedProva(provaId: string): void {
  slotOf(provaId).invalidate();
}
