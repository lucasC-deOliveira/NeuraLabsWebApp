import { describe, it, expect } from "vitest";
import type { FlashcardData } from "@/types";
import { applyInterleaving, getNextCardAlgorithm } from "./interleaving";

function card(id: string, conceito: string): FlashcardData {
  return { id, pergunta: `Q${id}`, resposta: `A${id}`, conceito };
}

describe("interleaving", () => {
  describe("applyInterleaving", () => {
    it("returns empty array when input is empty", () => {
      const result = applyInterleaving([]);
      expect(result).toEqual([]);
    });

    it("returns same cards when fewer than maxPerConcept", () => {
      const cards = [card("1", "A"), card("2", "A")];
      const result = applyInterleaving(cards, 3);
      expect(result).toHaveLength(2);
      expect(result.map((c) => c.id)).toEqual(["1", "2"]);
    });

    it("interleaves so no more than maxPerConcept consecutive same concept", () => {
      const cards = [
        card("1", "Math"),
        card("2", "Math"),
        card("3", "Math"),
        card("4", "Math"),
        card("5", "Physics"),
        card("6", "Physics"),
      ];
      const result = applyInterleaving(cards, 2);

      expect(result).toHaveLength(6);
      for (let i = 0; i <= result.length - 3; i++) {
        const section = result.slice(i, i + 3);
        const allSameConcept = section.every(
          (c) => c.conceito === section[0].conceito,
        );
        expect(allSameConcept).toBe(false);
      }
    });

    it("works with single concept (returns all cards)", () => {
      const cards = [
        card("1", "Math"),
        card("2", "Math"),
        card("3", "Math"),
      ];
      const result = applyInterleaving(cards, 2);
      expect(result).toHaveLength(3);
      expect(new Set(result.map((c) => c.id))).toEqual(new Set(["1", "2", "3"]));
    });

    it("contains all input cards exactly once", () => {
      const cards = [
        card("1", "A"),
        card("2", "B"),
        card("3", "C"),
        card("4", "A"),
      ];
      const result = applyInterleaving(cards);
      expect(result.map((c) => c.id).sort()).toEqual(["1", "2", "3", "4"]);
    });

    it("respects custom maxPerConcept of 1", () => {
      const cards = [
        card("1", "A"),
        card("2", "A"),
        card("3", "B"),
        card("4", "B"),
      ];
      const result = applyInterleaving(cards, 1);

      for (let i = 1; i < result.length; i++) {
        if (result[i].conceito === result[i - 1].conceito) {
          // Check if interleaving was unavoidable (not enough other concepts)
          const conceptCount = result.filter(
            (c) => c.conceito === result[i].conceito,
          ).length;
          const otherConcepts =
            new Set(result.map((c) => c.conceito)).size - 1;
          // If there were enough slots to interleave, this shouldn't happen
          if (otherConcepts >= conceptCount - 1) {
            expect(false).toBe(true);
          }
        }
      }
    });
  });

  describe("getNextCardAlgorithm", () => {
    it("returns null when no candidates left", () => {
      const cards = [card("1", "A")];
      const result = getNextCardAlgorithm(cards, new Set(["1"]), []);
      expect(result).toBeNull();
    });

    it("returns null when empty input", () => {
      const result = getNextCardAlgorithm([], new Set(), []);
      expect(result).toBeNull();
    });

    it("prioritizes weakest concepts (lowest accuracy first)", () => {
      const cards = [
        card("strong1", "Strong"),
        card("weak1", "Weak"),
      ];
      const history = [
        { flashcardId: "strong1", acertou: true },
        { flashcardId: "weak1", acertou: false },
      ];
      const result = getNextCardAlgorithm(cards, new Set(), history);
      expect(result?.conceito).toBe("Weak");
    });

    it("treats concepts with no history as neutral (0.5 accuracy)", () => {
      const cards = [
        card("1", "History"),
        card("2", "Unknown"),
      ];
      const history = [
        { flashcardId: "1", acertou: true },
        { flashcardId: "1", acertou: true },
      ];
      const result = getNextCardAlgorithm(cards, new Set(), history);
      expect(result?.conceito).toBe("Unknown");
    });

    it("respects interleaving when maxPerConcept exceeded for last concept", () => {
      const cards = [
        card("1", "A"),
        card("2", "A"),
        card("3", "A"),
        card("4", "B"),
      ];
      // Cards "2" and "3" reviewed, both concept A -> recent concept is A
      const result = getNextCardAlgorithm(cards, new Set(["3", "2"]), []);
      expect(result?.conceito).toBe("B");
    });

    it("returns a card when no interleaving constraint violated", () => {
      const cards = [
        card("1", "A"),
        card("2", "B"),
      ];
      const result = getNextCardAlgorithm(cards, new Set(), []);
      expect(result).toBeDefined();
      expect(result?.id).toBe("1");
    });
  });
});
