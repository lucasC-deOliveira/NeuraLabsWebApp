import { describe, it, expect } from "vitest";
import { saveManualFlashcard, type ManualFlashcardDraft } from "./save-manual-flashcard";
import { FakeContentPort } from "@/modules/content/testing/fake-content-port";
import type { FlashcardsPort, CreateFlashcardInput } from "../ports/flashcards.port";

class FakeFlashcardsPort implements FlashcardsPort {
  public lastInput: CreateFlashcardInput | null = null;
  async getFlashcards() { return []; }
  async getFilterData() { return []; }
  async getConceptHierarchy() { return []; }
  async createFlashcard(input: CreateFlashcardInput) { this.lastInput = input; return { flashcardId: "fc-1" }; }
  async updateFlashcard() { /* noop */ }
  async deleteFlashcard() { /* noop */ }
  async deleteAllFlashcards() { return { count: 0 }; }
}

const EMPTY_STAGED = { tree: [], pendingAssuntos: [], pendingTopics: [], pendingConcepts: [] };

describe("saveManualFlashcard", () => {
  it("creates a flashcard under an existing concept", async () => {
    const content = new FakeContentPort();
    const flashcards = new FakeFlashcardsPort();
    const draft: ManualFlashcardDraft = {
      selectedConceptId: "concept-1", tipo: "DEFINICAO",
      card: { pergunta: "O que é X?", resposta: "y" }, staged: EMPTY_STAGED,
    };
    const result = await saveManualFlashcard({ content, flashcards }, draft);
    expect(result).toEqual({ flashcardId: "fc-1" });
    expect(flashcards.lastInput).toEqual({ pergunta: "O que é X?", resposta: "y", conceitoId: "concept-1", tipo: "DEFINICAO" });
  });

  it("resolves a pending concept id created during save", async () => {
    const content = new FakeContentPort();
    const flashcards = new FakeFlashcardsPort();
    const draft: ManualFlashcardDraft = {
      selectedConceptId: "pending:pc1", tipo: "EXPLICACAO",
      card: { pergunta: "q", resposta: "a" },
      staged: {
        tree: [], pendingAssuntos: [], pendingTopics: [],
        pendingConcepts: [{ tempId: "pc1", nome: "Novo", relsToTopics: [{ targetTopicoId: "t-real", tipoRelacao: "FUNDAMENTA" }], relsToPendingTopics: [] }],
      },
    };
    await saveManualFlashcard({ content, flashcards }, draft);
    expect(flashcards.lastInput?.conceitoId).toBe("c-1");
  });
});
