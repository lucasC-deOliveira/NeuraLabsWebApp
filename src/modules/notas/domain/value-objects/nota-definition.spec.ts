import { describe, it, expect } from "vitest";
import { NotaDefinition } from "./nota-definition";

describe("NotaDefinition", () => {
  it("creates with trimmed term and explanation", () => {
    const d = NotaDefinition.create("  Soberania  ", "  Poder supremo do Estado  ");
    expect(d.term).toBe("Soberania");
    expect(d.explanation).toBe("Poder supremo do Estado");
  });

  it("toDisplay returns 'term: explanation'", () => {
    const d = NotaDefinition.create("Federalismo", "Organização em entes federados");
    expect(d.toDisplay()).toBe("Federalismo: Organização em entes federados");
  });

  it("throws when term is empty string", () => {
    expect(() => NotaDefinition.create("", "explicação")).toThrow();
  });

  it("throws when term is only whitespace", () => {
    expect(() => NotaDefinition.create("   ", "explicação")).toThrow();
  });

  it("allows empty explanation", () => {
    const d = NotaDefinition.create("Termo", "");
    expect(d.explanation).toBe("");
    expect(d.toDisplay()).toBe("Termo: ");
  });

  // Mutation: term trimming must happen before empty check
  it("correctly trims before validating — non-empty after trim is valid", () => {
    expect(() => NotaDefinition.create(" Soberania ", "X")).not.toThrow();
  });

  // Mutation: two definitions with same term are independent instances
  it("two instances with same term are structurally equal but distinct", () => {
    const a = NotaDefinition.create("X", "Y");
    const b = NotaDefinition.create("X", "Y");
    expect(a.term).toBe(b.term);
    expect(a).not.toBe(b);
  });
});
