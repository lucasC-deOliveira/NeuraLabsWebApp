import { describe, it, expect, beforeEach } from "vitest";
import { loadCachedQuestoes, saveCachedQuestoes } from "./questoes-cache";
import type { QuestaoListItem } from "../../domain/questao.types";

class FakeLocalStorage {
  private store = new Map<string, string>();
  getItem(key: string): string | null {
    return this.store.get(key) ?? null;
  }
  setItem(key: string, value: string): void {
    this.store.set(key, value);
  }
  clear(): void {
    this.store.clear();
  }
}

const KEY = "neuralabs.questoes-cache.v1";

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

  it("returns null instead of throwing on corrupt JSON", () => {
    localStorage.setItem(KEY, "{not json");
    expect(loadCachedQuestoes()).toBeNull();
  });

  // Regressão da mesma classe que quebrou o baralho: payload de formato antigo,
  // sem conceitosConectados, quebrava a página ao iterar o campo ausente.
  it("refuses questions from an older format, missing the connected concepts", () => {
    localStorage.setItem(KEY, JSON.stringify([{ id: "q1", enunciado: "x", tipo: "MULTIPLA_ESCOLHA" }]));
    expect(loadCachedQuestoes()).toBeNull();
  });

  it("refuses a payload that is not a list", () => {
    localStorage.setItem(KEY, JSON.stringify({ nope: true }));
    expect(loadCachedQuestoes()).toBeNull();
  });
});
