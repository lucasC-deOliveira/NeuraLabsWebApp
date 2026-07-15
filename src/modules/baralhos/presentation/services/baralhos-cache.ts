// Cache local (localStorage) da listagem de baralhos — para reabrir a página
// instantaneamente (stale-while-revalidate): mostra o último payload na hora e
// revalida no backend em segundo plano. A listagem é filtrada no cliente, então é um
// snapshot único (sem chave por filtro). Falhas são silenciosas: é só uma otimização.
import type { BaralhoItem } from "../../domain/baralho.types";

// Versionada: um payload antigo com outro formato é ignorado em vez de quebrar a lista.
const KEY = "neuralabs.baralhos-cache.v1";

export function loadCachedBaralhos(): BaralhoItem[] | null {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as BaralhoItem[];
    return parsed.map(reviveBaralho);
  } catch {
    return null;
  }
}

export function saveCachedBaralhos(baralhos: BaralhoItem[]): void {
  try {
    localStorage.setItem(KEY, JSON.stringify(baralhos));
  } catch {
    // quota estourada / modo privado — o cache é apenas uma otimização.
  }
}

// JSON serializa Date como string; a listagem ordena por data de criação, então ela
// volta a ser Date na leitura.
function reviveBaralho(baralho: BaralhoItem): BaralhoItem {
  return { ...baralho, dataCriacao: new Date(baralho.dataCriacao) };
}
