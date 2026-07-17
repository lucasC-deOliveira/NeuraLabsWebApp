import { describe, it, expect } from "vitest";
import { expandActionFor } from "./node-expand-action";

describe("expandActionFor", () => {
  it("classifies a baralho as populate", () => {
    expect(expandActionFor("BARALHO")?.kind).toBe("populate");
  });

  it("treats structural nodes as expand", () => {
    for (const t of ["ASSUNTO", "TOPICO", "CONCEITO", "NOTA"]) {
      expect(expandActionFor(t)?.kind).toBe("expand");
    }
  });

  it("treats a flashcard as classify", () => {
    expect(expandActionFor("FLASHCARD")?.kind).toBe("classify");
  });

  it("returns null for types with no natural expansion", () => {
    for (const t of ["PROVA", "QUESTION", "EDITAL", "GRAFO_REF"]) {
      expect(expandActionFor(t)).toBeNull();
    }
  });

  it("returns null for missing type", () => {
    expect(expandActionFor(null)).toBeNull();
    expect(expandActionFor(undefined)).toBeNull();
    expect(expandActionFor("")).toBeNull();
  });

  it("gives every supported type a non-empty label", () => {
    for (const t of ["BARALHO", "ASSUNTO", "FLASHCARD"]) {
      expect(expandActionFor(t)?.label.length).toBeGreaterThan(0);
    }
  });
});
