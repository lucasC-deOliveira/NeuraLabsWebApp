import { describe, it, expect } from "vitest";
import { NotaDefinition } from "../value-objects/nota-definition";
import { NotaSection } from "./nota-section";

describe("NotaDefinition", () => {
  it("should create a definition with term and explanation", () => {
    const def = NotaDefinition.create("Soberania", "O poder supremo do Estado");

    expect(def.term).toBe("Soberania");
    expect(def.explanation).toBe("O poder supremo do Estado");
  });

  it("should trim term and explanation", () => {
    const def = NotaDefinition.create("  Soberania  ", "  Poder supremo  ");

    expect(def.term).toBe("Soberania");
    expect(def.explanation).toBe("Poder supremo");
  });

  it("should throw if term is empty", () => {
    expect(() => NotaDefinition.create("", "explanation")).toThrow(
      "Definition term cannot be empty",
    );
  });

  it("should throw if term is only spaces", () => {
    expect(() => NotaDefinition.create("   ", "explanation")).toThrow(
      "Definition term cannot be empty",
    );
  });

  it("should format display string", () => {
    const def = NotaDefinition.create("Legalidade", "Agir conforme a lei");

    expect(def.toDisplay()).toBe("Legalidade: Agir conforme a lei");
  });
});
