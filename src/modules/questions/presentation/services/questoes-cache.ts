// Cache local (localStorage) da listagem de questões — para reabrir a página
// instantaneamente (stale-while-revalidate). A lista é filtrada no cliente, então é
// um snapshot único. Falhas são silenciosas: é só uma otimização.
import type { QuestaoListItem } from "../../domain/questao.types";

// Versionada: um payload de formato antigo é ignorado em vez de quebrar a página.
// Mudou a forma de QuestaoListItem? Vire a versão. (v1 nasceu já com
// conceitosConectados; a checagem de forma abaixo é a rede de segurança.)
const KEY = "neuralabs.questoes-cache.v1";

export function loadCachedQuestoes(): QuestaoListItem[] | null {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as QuestaoListItem[];
    if (!isUsable(parsed)) return null;
    return parsed;
  } catch {
    return null;
  }
}

export function saveCachedQuestoes(questoes: QuestaoListItem[]): void {
  try {
    localStorage.setItem(KEY, JSON.stringify(questoes));
  } catch {
    // quota estourada / modo privado — o cache é apenas uma otimização.
  }
}

// O cache é uma fronteira não confiável: o que está no disco pode ter sido gravado
// por uma versão anterior do app. Um payload defasado vira "cache vazio" em vez de
// quebrar a tela — foi assim que o baralho quebrou quando as tags chegaram.
function isUsable(parsed: QuestaoListItem[]): boolean {
  if (!Array.isArray(parsed)) return false;
  return parsed.every((q) => Array.isArray(q.conceitosConectados));
}
