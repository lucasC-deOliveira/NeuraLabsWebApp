import { describe, expect, it } from "vitest";
import { planFlashcards } from "../../scripts/vault-flashcard-proposal";

const noteId = "20f2a52b-554d-40af-a829-8d893e3cba69";
const conceptId = "2958b812-13a7-43c3-9366-d669b1cdca7f";
const draft = {
  version: 1,
  noteId,
  target: { existingDeckId: "deck" },
  cards: [{ id: "2f7410bb-a74a-4e5e-bd34-567e09f3fee4", question: "Why?", answer: "Evidence.", type: "pergunta_resposta", conceptId, evidence: "Evidence." }],
};
const snapshot = JSON.stringify({ formatVersion: 1, decks: [{ id: "deck", title: "Review", cards: [{ id: "old", question: "Before?", answer: "Answer", schedule: null }] }], reviews: [] });

function readFixtureNote(id: string): string {
  return id === noteId ? `Evidence. [[${conceptId}|Concept]]` : "titulo: Concept";
}

describe("external vault flashcards", () => {
  it("appends an unscheduled card to the selected deck", () => {
    const plan = planFlashcards(snapshot, draft, readFixtureNote);
    expect(JSON.parse(plan.next).decks[0].cards).toMatchObject([{ id: "old" }, { id: draft.cards[0].id, schedule: null, concept: "Concept" }]);
  });

  it("rejects duplicate questions in the destination deck", () => {
    const cards = [{ ...draft.cards[0], question: "BEFORE!" }];
    expect(() => planFlashcards(snapshot, { ...draft, cards }, readFixtureNote)).toThrow(/Duplicate/);
  });

  it("rejects cards whose evidence is missing from the note", () => {
    const cards = [{ ...draft.cards[0], evidence: "Missing" }];
    expect(() => planFlashcards(snapshot, { ...draft, cards }, readFixtureNote)).toThrow(/Invalid evidence/);
  });
});
