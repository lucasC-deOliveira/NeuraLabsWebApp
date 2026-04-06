import { describe, it, expect } from "vitest";
import { Flashcard } from "./flashcard";
import { SpacedRepetitionData } from "../value-objects/flashcard-spaced-data";

describe("Flashcard Entity", () => {
  it("should create a flashcard with required fields", () => {
    const fc = Flashcard.create("What is X?", "X is Y", "concept-1", "X", "user-1");

    expect(fc.id).toBeDefined();
    expect(fc.userId).toBe("user-1");
    expect(fc.pergunta).toBe("What is X?");
    expect(fc.resposta).toBe("X is Y");
    expect(fc.conceitoId).toBe("concept-1");
    expect(fc.conceitoNome).toBe("X");
    expect(fc.spacedRepetition).toBeNull();
  });

  it("should throw if pergunta is empty", () => {
    expect(() => Flashcard.create("", "answer", "c1", "C", "u1")).toThrow(
      "Flashcard pergunta cannot be empty",
    );
  });

  it("should throw if resposta is empty", () => {
    expect(() => Flashcard.create("question", "", "c1", "C", "u1")).toThrow(
      "Flashcard resposta cannot be empty",
    );
  });

  it("should trim pergunta and resposta", () => {
    const fc = Flashcard.create("  question  ", "  answer  ", "c1", "C", "u1");

    expect(fc.pergunta).toBe("question");
    expect(fc.resposta).toBe("answer");
  });

  it("should update question", () => {
    const fc = Flashcard.create("Old?", "Answer", "c1", "C", "u1");
    fc.updateQuestion("New?");

    expect(fc.pergunta).toBe("New?");
  });

  it("should update answer", () => {
    const fc = Flashcard.create("Q?", "Old", "c1", "C", "u1");
    fc.updateAnswer("New");

    expect(fc.resposta).toBe("New");
  });

  it("should not update if new value is empty", () => {
    const fc = Flashcard.create("Q?", "Answer", "c1", "C", "u1");
    fc.updateQuestion("");
    fc.updateAnswer("");

    expect(fc.pergunta).toBe("Q?");
    expect(fc.resposta).toBe("Answer");
  });

  it("should set spaced repetition data", () => {
    const fc = Flashcard.create("Q?", "A", "c1", "C", "u1");
    const sr = SpacedRepetitionData.create(5, 0, new Date(), new Date(), 1);
    fc.setSpacedRepetition(sr);

    expect(fc.spacedRepetition).not.toBeNull();
    expect(fc.spacedRepetition!.estagioAprendizado).toBe(1);
  });

  it("should return stage label", () => {
    const fc = Flashcard.create("Q?", "A", "c1", "C", "u1");
    const sr = SpacedRepetitionData.create(5, 6, new Date(), new Date(), 3);
    fc.setSpacedRepetition(sr);

    expect(fc.getStageLabel()).toBe("Conhece");
  });

  it("should restore from props", () => {
    const props = {
      id: "fc-1",
      userId: "user-1",
      pergunta: "Q?",
      resposta: "A",
      conceitoId: "c1",
      conceitoNome: "C",
      spacedRepetition: null,
      dataCriacao: new Date("2026-01-01"),
    };

    const fc = Flashcard.restore(props);

    expect(fc.id).toBe("fc-1");
    expect(fc.pergunta).toBe("Q?");
  });
});

describe("SpacedRepetitionData VO", () => {
  it("should create with all fields", () => {
    const now = new Date();
    const future = new Date(now.getTime() + 86400000);
    const sr = SpacedRepetitionData.create(5, 1, future, now, 1);

    expect(sr.dificuldade).toBe(5);
    expect(sr.intervalo).toBe(1);
    expect(sr.proximaRevisao).toBe(future);
    expect(sr.estagioAprendizado).toBe(1);
  });

  it("should detect if card is due", () => {
    const past = new Date("2020-01-01");
    const sr = SpacedRepetitionData.create(5, 1, past, new Date(), 1);

    expect(sr.isDue()).toBe(true);
  });

  it("should detect if card is overdue", () => {
    const past = new Date("2020-01-01");
    const sr = SpacedRepetitionData.create(5, 1, past, new Date(), 1);

    expect(sr.isOverdue()).toBe(true);
  });
});
