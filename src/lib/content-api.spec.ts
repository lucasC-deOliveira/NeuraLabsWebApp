import { describe, it, expect, vi, beforeEach } from "vitest";
import { apiFetch } from "./api";
import * as c from "./content-api";

vi.mock("./api", () => ({ apiFetch: vi.fn(() => Promise.resolve([])) }));
const mockApiFetch = vi.mocked(apiFetch);

beforeEach(() => mockApiFetch.mockClear());

const lastCall = () =>
  mockApiFetch.mock.calls[mockApiFetch.mock.calls.length - 1] as [string, RequestInit?];

describe("content-api date mapping", () => {
  it("getFlashcards converts dataCriacao and the nested spacedRepetition dates", async () => {
    mockApiFetch.mockResolvedValueOnce([
      {
        id: "f1",
        dataCriacao: "2024-01-01T00:00:00.000Z",
        spacedRepetition: {
          dificuldade: 1,
          proximaRevisao: "2024-02-01T00:00:00.000Z",
          ultimaRevisao: "2024-01-15T00:00:00.000Z",
        },
      },
    ]);
    const [card] = await c.getFlashcards();
    expect(card.dataCriacao).toBeInstanceOf(Date);
    expect(card.spacedRepetition?.proximaRevisao).toBeInstanceOf(Date);
    expect(card.spacedRepetition?.ultimaRevisao.toISOString()).toBe("2024-01-15T00:00:00.000Z");
  });

  it("getFlashcards keeps a null spacedRepetition as null", async () => {
    mockApiFetch.mockResolvedValueOnce([
      { id: "f1", dataCriacao: "2024-01-01T00:00:00.000Z", spacedRepetition: null },
    ]);
    const [card] = await c.getFlashcards();
    expect(card.spacedRepetition).toBeNull();
  });

  it("getStudySessionHistory maps dataInicio and the nullable dataFim", async () => {
    mockApiFetch.mockResolvedValueOnce([
      { id: "s1", dataInicio: "2024-01-01T00:00:00.000Z", dataFim: "2024-01-01T01:00:00.000Z" },
      { id: "s2", dataInicio: "2024-01-02T00:00:00.000Z", dataFim: null },
    ]);
    const [a, b] = await c.getStudySessionHistory();
    expect(a.dataFim).toBeInstanceOf(Date);
    expect(b.dataFim).toBeNull();
  });
});

describe("content-api routes", () => {
  it("reads subjects/hierarchy/tree/filters", async () => {
    await c.getSubjects();
    expect(lastCall()[0]).toBe("/subjects");
    await c.getConceptHierarchy();
    expect(lastCall()[0]).toBe("/subjects/hierarchy");
    await c.getHierarquiaConceitos();
    expect(lastCall()[0]).toBe("/subjects/tree");
    await c.getFlashcardFilterData();
    expect(lastCall()[0]).toBe("/flashcards/filters");
    await c.previewFlashcardsFromNota("n1");
    expect(lastCall()[0]).toBe("/notas/n1/flashcard-preview");
  });

  it("creates/updates/deletes flashcards", async () => {
    await c.createFlashcard({ pergunta: "P", resposta: "R" });
    expect(lastCall()).toEqual(["/flashcards", { method: "POST", body: JSON.stringify({ pergunta: "P", resposta: "R" }) }]);
    await c.updateFlashcard("f1", { resposta: "R2" });
    expect(lastCall()).toEqual(["/flashcards/f1", { method: "PATCH", body: JSON.stringify({ resposta: "R2" }) }]);
    await c.deleteFlashcard("f1");
    expect(lastCall()).toEqual(["/flashcards/f1", { method: "DELETE" }]);
    await c.deleteAllFlashcards();
    expect(lastCall()).toEqual(["/flashcards", { method: "DELETE" }]);
  });

  it("creates subjects/topicos/concepts and saves previews", async () => {
    await c.createAssunto("Bio");
    expect(lastCall()).toEqual(["/subjects", { method: "POST", body: JSON.stringify({ nome: "Bio" }) }]);
    await c.createTopico("Cel", "a1");
    expect(lastCall()).toEqual(["/subjects/a1/topicos", { method: "POST", body: JSON.stringify({ nome: "Cel" }) }]);
    await c.createFullConcept({ nome: "Mitose", assuntoId: "a1", topicoId: "t1" });
    expect(lastCall()[0]).toBe("/conceitos");
    await c.saveFlashcardPreviewsFromNota("n1", []);
    expect(lastCall()).toEqual(["/notas/n1/flashcards", { method: "POST", body: JSON.stringify({ flashcards: [] }) }]);
  });
});
