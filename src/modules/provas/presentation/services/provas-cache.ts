// Cache local (localStorage) da listagem de provas — para reabrir a página
// instantaneamente (stale-while-revalidate). A lista é filtrada no cliente, então é
// um snapshot único (sem chave por filtro). Falhas são silenciosas: é só uma
// otimização. O cache de UMA prova aberta é outro, por id (prova-detail-cache).
import type { ProvaListItem } from "../../domain/prova.types";

// Versionada: um payload de formato antigo é ignorado em vez de quebrar a página.
// Mudou a forma de ProvaListItem? Vire a versão.
const KEY = "neuralabs.provas-cache.v1";

// O cache é uma fronteira não confiável: o que está no disco pode ter sido gravado
// por uma versão anterior do app. Um payload defasado vira "cache vazio" em vez de
// quebrar a tela — foi assim que o baralho quebrou quando as tags chegaram.
function isUsable(parsed: ProvaListItem[]): boolean {
  if (!Array.isArray(parsed)) return false;
  return parsed.every((p) => typeof p.id === "string" && typeof p.totalQuestoes === "number");
}

export function loadCachedProvas(): ProvaListItem[] | null {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as ProvaListItem[];
    return isUsable(parsed) ? parsed : null;
  } catch {
    return null;
  }
}

export function saveCachedProvas(provas: ProvaListItem[]): void {
  try {
    localStorage.setItem(KEY, JSON.stringify(provas));
  } catch {
    // quota estourada / modo privado — o cache é apenas uma otimização.
  }
}
