import { describe, it, expect, beforeEach } from "vitest";
import {
  loadCachedFlashcards,
  saveCachedFlashcards,
  invalidateFlashcardsList,
  type FlashcardsSnapshot,
} from "./flashcards-cache";
import type { FlashcardItem } from "../../domain/flashcard.types";

// API Storage completa (incl. length/key) porque invalidateFlashcardsList varre por tag.
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

const CREATED = new Date("2026-01-10T12:00:00Z");

function card(over: Partial<FlashcardItem> = {}): FlashcardItem {
  return {
    id: "c1", tipo: null, pergunta: "p", resposta: "r", conceito: "Concept", topico: "T", topicoId: "t1",
    assunto: "A", assuntoId: "a1", conceitosConectados: [], dataCriacao: CREATED, spacedRepetition: null, ...over,
  };
}

const snapshot = (over: Partial<FlashcardsSnapshot> = {}): FlashcardsSnapshot => ({
  cards: [card()],
  filterData: [],
  concepts: [],
  ...over,
});

beforeEach(() => {
  (globalThis as unknown as { localStorage: FakeLocalStorage }).localStorage = new FakeLocalStorage();
});

describe("flashcards-cache", () => {
  it("returns null when nothing is cached", () => {
    expect(loadCachedFlashcards()).toBeNull();
  });

  it("round-trips the cached snapshot", () => {
    saveCachedFlashcards(snapshot());
    expect(loadCachedFlashcards()?.cards[0].id).toBe("c1");
  });

  it("revives creation dates as Date, not the serialized string", () => {
    saveCachedFlashcards(snapshot());
    const revived = loadCachedFlashcards()?.cards[0].dataCriacao;
    expect(revived).toBeInstanceOf(Date);
    expect(revived?.getTime()).toBe(CREATED.getTime());
  });

  it("revives the spaced repetition review dates", () => {
    const due = new Date("2026-02-01T08:00:00Z");
    saveCachedFlashcards(
      snapshot({
        cards: [
          card({
            spacedRepetition: {
              dificuldade: 3, intervalo: 5, proximaRevisao: due, ultimaRevisao: CREATED, estagioAprendizado: 2,
            },
          }),
        ],
      }),
    );
    const sr = loadCachedFlashcards()?.cards[0].spacedRepetition;
    expect(sr?.proximaRevisao).toBeInstanceOf(Date);
    expect(sr?.proximaRevisao.getTime()).toBe(due.getTime());
  });

  it("keeps a null spaced repetition null", () => {
    saveCachedFlashcards(snapshot());
    expect(loadCachedFlashcards()?.cards[0].spacedRepetition).toBeNull();
  });

  // Sem o array de cards o revive quebraria ao iterar — o accept faz virar miss.
  it("returns null instead of throwing when the cached shape is unusable", () => {
    saveCachedFlashcards({ cards: null } as unknown as FlashcardsSnapshot);
    expect(loadCachedFlashcards()).toBeNull();
  });

  // Invalidação proativa: após criar/editar/apagar card, o snapshot cacheado some.
  it("invalidateFlashcardsList drops the cached snapshot", () => {
    saveCachedFlashcards(snapshot());
    invalidateFlashcardsList();
    expect(loadCachedFlashcards()).toBeNull();
  });
});
