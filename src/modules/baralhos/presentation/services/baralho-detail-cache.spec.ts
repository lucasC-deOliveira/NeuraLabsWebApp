import { describe, it, expect, beforeEach } from "vitest";
import { loadCachedBaralho, saveCachedBaralho, forgetCachedBaralho } from "./baralho-detail-cache";
import type { BaralhoDetail } from "../../domain/baralho.types";

// API Storage suficiente para load/save/forget (get/set/remove). A robustez do
// mecanismo (JSON corrompido, versão antiga) é coberta em local-cache-store.spec.
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
}

const CREATED = new Date("2026-07-14T12:00:00Z");

function detail(over: Partial<BaralhoDetail> = {}): BaralhoDetail {
  return {
    id: "b1",
    titulo: "Biologia",
    dataCriacao: CREATED,
    origens: [],
    cards: [
      {
        id: "c1",
        pergunta: "p",
        resposta: "r",
        tipo: "DEFINICAO",
        conceito: "Alelos",
        conceitosConectados: [],
      },
    ],
    ...over,
  };
}

beforeEach(() => {
  (globalThis as unknown as { localStorage: FakeLocalStorage }).localStorage = new FakeLocalStorage();
});

describe("baralho-detail-cache", () => {
  it("returns null when the deck was never cached", () => {
    expect(loadCachedBaralho("b1")).toBeNull();
  });

  it("round-trips a cached deck with its cards", () => {
    saveCachedBaralho(detail());
    expect(loadCachedBaralho("b1")?.cards[0].pergunta).toBe("p");
  });

  it("keeps each deck under its own key", () => {
    saveCachedBaralho(detail({ id: "b1", titulo: "Bio" }));
    saveCachedBaralho(detail({ id: "b2", titulo: "Química" }));
    expect(loadCachedBaralho("b1")?.titulo).toBe("Bio");
    expect(loadCachedBaralho("b2")?.titulo).toBe("Química");
  });

  it("revives the creation date as Date, not the serialized string", () => {
    saveCachedBaralho(detail());
    const revived = loadCachedBaralho("b1")?.dataCriacao;
    expect(revived).toBeInstanceOf(Date);
    expect(revived?.getTime()).toBe(CREATED.getTime());
  });

  it("caches an empty deck as empty, not as a miss", () => {
    saveCachedBaralho(detail({ cards: [] }));
    expect(loadCachedBaralho("b1")?.cards).toEqual([]);
  });

  it("forgets a deck, so a deleted one does not come back from cache", () => {
    saveCachedBaralho(detail());
    forgetCachedBaralho("b1");
    expect(loadCachedBaralho("b1")).toBeNull();
  });

  it("refuses a cached payload without cards, instead of rendering a broken deck", () => {
    saveCachedBaralho({ id: "b1" } as unknown as BaralhoDetail);
    expect(loadCachedBaralho("b1")).toBeNull();
  });

  // Regressão: um baralho gravado antes de os cartões terem conceitosConectados era
  // lido de volta e a página quebrava ao iterar o campo ausente (tela preta). Um
  // payload de formato antigo tem de virar cache vazio.
  it("refuses cards from an older format, missing the connected concepts", () => {
    const stale = { ...detail(), cards: [{ id: "c1", pergunta: "p", resposta: "r" }] };
    saveCachedBaralho(stale as unknown as BaralhoDetail);
    expect(loadCachedBaralho("b1")).toBeNull();
  });
});
