// Cache local (localStorage) de uma prova aberta — para reabri-la instantaneamente
// (stale-while-revalidate). Como o do baralho, é por prova: a chave leva o id.
// Falhas são silenciosas: é só uma otimização.
import type { ProvaDetail } from "../../domain/prova.types";

// Versionada: um payload antigo com outro formato é ignorado em vez de quebrar a
// página. Mudou a forma de ProvaDetail? Vire a versão. (v1 nasceu já com
// conceitosConectados; a checagem de forma abaixo é a rede de segurança.)
const KEY_PREFIX = "neuralabs.prova-detail-cache.v1.";

const keyOf = (provaId: string): string => KEY_PREFIX + provaId;

// O cache é uma fronteira não confiável: o que está no disco pode ter sido gravado
// por uma versão anterior do app. Virar a chave acima é o mecanismo principal, mas
// depende de alguém lembrar — então a forma também é conferida antes de usar, para
// um payload defasado virar "cache vazio" em vez de quebrar a tela (foi assim que o
// baralho quebrou quando as tags chegaram).
function isUsable(parsed: ProvaDetail): boolean {
  if (!parsed || !Array.isArray(parsed.questoes)) return false;
  return parsed.questoes.every((q) => Array.isArray(q.conceitosConectados));
}

export function loadCachedProva(provaId: string): ProvaDetail | null {
  try {
    const raw = localStorage.getItem(keyOf(provaId));
    if (!raw) return null;
    const parsed = JSON.parse(raw) as ProvaDetail;
    return isUsable(parsed) ? parsed : null;
  } catch {
    return null;
  }
}

export function saveCachedProva(prova: ProvaDetail): void {
  try {
    localStorage.setItem(keyOf(prova.id), JSON.stringify(prova));
  } catch {
    // quota estourada / modo privado — o cache é apenas uma otimização.
  }
}
