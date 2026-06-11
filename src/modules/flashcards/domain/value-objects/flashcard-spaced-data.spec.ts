import { describe, it, expect, vi, afterEach } from "vitest";
import { SpacedRepetitionData } from "./flashcard-spaced-data";

const past = new Date(Date.now() - 86_400_000); // yesterday
const future = new Date(Date.now() + 86_400_000); // tomorrow
const now = new Date();

describe("SpacedRepetitionData", () => {
  it("exposes all props via getters", () => {
    const srd = SpacedRepetitionData.create(3, 7, future, past, 2);
    expect(srd.dificuldade).toBe(3);
    expect(srd.intervalo).toBe(7);
    expect(srd.proximaRevisao).toEqual(future);
    expect(srd.ultimaRevisao).toEqual(past);
    expect(srd.estagioAprendizado).toBe(2);
  });

  describe("isDue()", () => {
    it("returns true when proximaRevisao is in the past", () => {
      const srd = SpacedRepetitionData.create(3, 1, past, past, 0);
      expect(srd.isDue()).toBe(true);
    });

    it("returns false when proximaRevisao is in the future", () => {
      const srd = SpacedRepetitionData.create(3, 7, future, now, 1);
      expect(srd.isDue()).toBe(false);
    });

    // Mutation: boundary — due today (past <= now) should be true
    it("returns true when proximaRevisao is exactly now or earlier", () => {
      const justBefore = new Date(Date.now() - 1);
      const srd = SpacedRepetitionData.create(3, 1, justBefore, past, 0);
      expect(srd.isDue()).toBe(true);
    });
  });

  describe("isOverdue()", () => {
    it("returns true when review date is in the past", () => {
      const srd = SpacedRepetitionData.create(3, 1, past, past, 0);
      expect(srd.isOverdue()).toBe(true);
    });

    it("returns false when review date is in the future", () => {
      const srd = SpacedRepetitionData.create(3, 7, future, now, 1);
      expect(srd.isOverdue()).toBe(false);
    });
  });
});
