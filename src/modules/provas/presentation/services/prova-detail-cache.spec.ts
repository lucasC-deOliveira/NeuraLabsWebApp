import { describe, it, expect, beforeEach } from "vitest";
import { loadCachedProva, saveCachedProva } from "./prova-detail-cache";
import type { ProvaDetail, ProvaQuestaoItem } from "../../domain/prova.types";

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
  clear(): void {
    this.store.clear();
  }
}

function questao(over: Partial<ProvaQuestaoItem> = {}): ProvaQuestaoItem {
  return {
    ordem: 0,
    id: "q1",
    tipo: "MULTIPLA_ESCOLHA",
    enunciado: "O que a planta faz com a luz?",
    alternativas: [{ letra: "A", texto: "Fotossintese" }],
    gabarito: "A",
    explicacao: null,
    conceitoNome: null,
    conceitosConectados: [
      { conceito: "Fotossintese", topico: "Metabolismo", topicoId: "t1", assunto: "Biologia", assuntoId: "a1" },
    ],
    ...over,
  };
}

function detail(over: Partial<ProvaDetail> = {}): ProvaDetail {
  return {
    id: "p1",
    titulo: "Enem 2025",
    descricao: null,
    dataCriacao: "2026-07-14T12:00:00.000Z",
    questoes: [questao()],
    ...over,
  };
}

beforeEach(() => {
  Object.defineProperty(globalThis, "localStorage", { value: new FakeLocalStorage(), writable: true });
});

describe("prova detail cache", () => {
  it("has nothing cached before the first save", () => {
    expect(loadCachedProva("p1")).toBeNull();
  });

  it("round-trips the exam it saved", () => {
    saveCachedProva(detail());
    expect(loadCachedProva("p1")?.titulo).toBe("Enem 2025");
    expect(loadCachedProva("p1")?.questoes[0].conceitosConectados[0].conceito).toBe("Fotossintese");
  });

  // A chave leva o id: abrir a prova B não pode devolver a prova A.
  it("caches each exam under its own key", () => {
    saveCachedProva(detail());
    saveCachedProva(detail({ id: "p2", titulo: "Serpro 2023" }));
    expect(loadCachedProva("p1")?.titulo).toBe("Enem 2025");
    expect(loadCachedProva("p2")?.titulo).toBe("Serpro 2023");
    expect(loadCachedProva("p3")).toBeNull();
  });

  it("treats corrupted json as no cache, instead of throwing", () => {
    localStorage.setItem("neuralabs.prova-detail-cache.v1.p1", "{ not json");
    expect(loadCachedProva("p1")).toBeNull();
  });

  // Regressão: foi um payload de formato antigo (sem as tags) que deixou o baralho
  // em tela preta. Aqui um payload defasado tem de virar "cache vazio".
  it("refuses a payload from an older shape, with no concept tags", () => {
    const antigo = { ...detail(), questoes: [{ ...questao(), conceitosConectados: undefined }] };
    localStorage.setItem("neuralabs.prova-detail-cache.v1.p1", JSON.stringify(antigo));
    expect(loadCachedProva("p1")).toBeNull();
  });

  it("refuses a payload with no questions array at all", () => {
    localStorage.setItem("neuralabs.prova-detail-cache.v1.p1", JSON.stringify({ id: "p1" }));
    expect(loadCachedProva("p1")).toBeNull();
  });
});
