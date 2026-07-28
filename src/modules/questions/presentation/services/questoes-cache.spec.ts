import { describe, it, expect, beforeEach } from "vitest";
import { loadCachedQuestoes, saveCachedQuestoes, invalidateQuestoesList } from "./questoes-cache";
import type { QuestaoListItem } from "../../domain/questao.types";

// API Storage completa (incl. length/key) porque invalidateQuestoesList varre por tag.
class FakeLocalStorage {
  private store = new Map<string, string>();
  getItem(key: string): string | null {
    return this.store.get(key) ?? null;
  }
  setItem(key: string, value: string): void {
    this.store.set(key, value);
  }
  removeItem(key: string): void {
    this.store.delete(key);
  }
  get length(): number {
    return this.store.size;
  }
  key(index: number): string | null {
    return [...this.store.keys()][index] ?? null;
  }
}

function questao(over: Partial<QuestaoListItem> = {}): QuestaoListItem {
  return {
    id: "q1",
    tipo: "MULTIPLA_ESCOLHA",
    enunciado: "O que é cache?",
    gabarito: "A",
    explicacao: null,
    alternativas: null,
    conceitoId: null,
    conceitoNome: null,
    conceitosConectados: [],
    dataCriacao: "2026-01-10T12:00:00.000Z",
    ...over,
  };
}

beforeEach(() => {
  (globalThis as unknown as { localStorage: FakeLocalStorage }).localStorage = new FakeLocalStorage();
});

describe("questoes-cache", () => {
  it("returns null when nothing is cached", () => {
    expect(loadCachedQuestoes()).toBeNull();
  });

  it("round-trips the cached questions", () => {
    saveCachedQuestoes([questao()]);
    expect(loadCachedQuestoes()?.[0]).toMatchObject({ id: "q1", enunciado: "O que é cache?" });
  });

  it("keeps the connected concept tags", () => {
    const tags = [
      { conceito: "Cache", topico: "Memória", topicoId: "t1", assunto: "Computação", assuntoId: "a1" },
    ];
    saveCachedQuestoes([questao({ conceitosConectados: tags })]);
    expect(loadCachedQuestoes()?.[0].conceitosConectados).toEqual(tags);
  });

  it("caches an empty list as empty, not as a miss", () => {
    saveCachedQuestoes([]);
    expect(loadCachedQuestoes()).toEqual([]);
  });

  // Regressão da mesma classe que quebrou o baralho: payload de formato antigo,
  // sem conceitosConectados, quebrava a página ao iterar o campo ausente.
  it("refuses questions from an older format, missing the connected concepts", () => {
    const stale = [{ id: "q1", enunciado: "x", tipo: "MULTIPLA_ESCOLHA" }];
    saveCachedQuestoes(stale as unknown as QuestaoListItem[]);
    expect(loadCachedQuestoes()).toBeNull();
  });

  // Invalidação proativa: após criar/apagar questão, a listagem cacheada some.
  it("invalidateQuestoesList drops the cached list", () => {
    saveCachedQuestoes([questao()]);
    invalidateQuestoesList();
    expect(loadCachedQuestoes()).toBeNull();
  });
});
