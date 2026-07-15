// Cache local (localStorage) de um baralho aberto — para reabrir o mesmo baralho
// instantaneamente (stale-while-revalidate). Diferente do cache da listagem, este é
// por baralho: a chave leva o id. Falhas são silenciosas: é só uma otimização.
import type { BaralhoDetail } from "../../domain/baralho.types";

// Versionada: um payload antigo com outro formato é ignorado em vez de quebrar a
// página. v2 = cartões passaram a ter conceitosConectados; um payload v1 não tem o
// campo e quebrava a tela ao ser lido. Mudou a forma de BaralhoDetail? Vire a versão.
const KEY_PREFIX = "neuralabs.baralho-detail-cache.v2.";

const keyOf = (baralhoId: string): string => KEY_PREFIX + baralhoId;

// O cache é uma fronteira não confiável: o que está no disco pode ter sido gravado
// por uma versão anterior do app. Virar a chave acima é o mecanismo principal, mas
// depende de alguém lembrar — então a forma também é conferida antes de usar, para
// um payload defasado virar "cache vazio" em vez de quebrar a tela.
function isUsable(parsed: BaralhoDetail): boolean {
  if (!parsed || !Array.isArray(parsed.cards)) return false;
  return parsed.cards.every((card) => Array.isArray(card.conceitosConectados));
}

export function loadCachedBaralho(baralhoId: string): BaralhoDetail | null {
  try {
    const raw = localStorage.getItem(keyOf(baralhoId));
    if (!raw) return null;
    const parsed = JSON.parse(raw) as BaralhoDetail;
    if (!isUsable(parsed)) return null;
    return { ...parsed, dataCriacao: new Date(parsed.dataCriacao) };
  } catch {
    return null;
  }
}

export function saveCachedBaralho(baralho: BaralhoDetail): void {
  try {
    localStorage.setItem(keyOf(baralho.id), JSON.stringify(baralho));
  } catch {
    // quota estourada / modo privado — o cache é apenas uma otimização.
  }
}

/** Esquece o baralho — usado ao excluí-lo, para o cache não ressuscitar um fantasma. */
export function forgetCachedBaralho(baralhoId: string): void {
  try {
    localStorage.removeItem(keyOf(baralhoId));
  } catch {
    // sem cache para limpar; segue o jogo.
  }
}
