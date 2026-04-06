import { describe, it, expect } from "vitest";
import { Nota } from "./nota";
import { NotaSection } from "./nota-section";
import { NotaDefinition } from "../value-objects/nota-definition";

describe("Nota Entity", () => {
  it("should create a nota with raw text and user id", () => {
    const nota = Nota.create("texto bruto aqui", "user-123");

    expect(nota.id).toBeDefined();
    expect(nota.userId).toBe("user-123");
    expect(nota.textoBruto).toBe("texto bruto aqui");
    expect(nota.titulo).toBeNull();
    expect(nota.hasContent()).toBe(true);
  });

  it("should create a nota with optional title", () => {
    const nota = Nota.create("texto aqui", "user-123", "Aula 1");

    expect(nota.titulo).toBe("Aula 1");
  });

  it("should detect empty content", () => {
    const nota = Nota.create("   ", "user-123");

    expect(nota.hasContent()).toBe(false);
  });

  it("should attach sections", () => {
    const nota = Nota.create("texto", "user-123");
    const section = NotaSection.create("Soberania", ["Linha 1"], [
      NotaDefinition.create("Soberania", "Poder supremo"),
    ]);
    nota.attachSections([section]);

    expect(nota.sections.length).toBe(1);
    expect(nota.sections[0].heading).toBe("Soberania");
  });

  it("should extract terms from sections", () => {
    const nota = Nota.create("texto", "user-123");
    nota.attachSections([
      NotaSection.create("Direitos", [], [
        NotaDefinition.create("Cidadania", "Conjunto de direitos"),
        NotaDefinition.create("Soberania", "Poder supremo"),
      ]),
      NotaSection.create("Princípios", ["conteúdo"], []),
    ]);

    const terms = nota.extractTerms();
    expect(terms).toContain("Cidadania");
    expect(terms).toContain("Soberania");
    expect(terms).toContain("Direitos");
    expect(terms).toContain("Princípios");
  });

  it("should link unique concepts", () => {
    const nota = Nota.create("texto", "user-123");
    nota.linkConcept("concept-1");
    nota.linkConcept("concept-2");
    nota.linkConcept("concept-1"); // duplicate

    expect(nota.conceitoIds).toEqual(["concept-1", "concept-2"]);
  });

  it("should generate unique flashcards", () => {
    const nota = Nota.create("texto", "user-123");
    nota.generateFlashcard("fc-1");
    nota.generateFlashcard("fc-2");
    nota.generateFlashcard("fc-1"); // duplicate

    expect(nota.flashcardIds).toEqual(["fc-1", "fc-2"]);
  });

  it("should restore from props", () => {
    const props = {
      id: "nota-1",
      userId: "user-1",
      titulo: "Teste",
      textoBruto: "raw text",
      sections: [],
      conceitoIds: ["c-1"],
      flashcardIds: ["f-1"],
      createdAt: new Date("2026-01-01"),
    };

    const nota = Nota.restore(props);

    expect(nota.id).toBe("nota-1");
    expect(nota.conceitoIds).toEqual(["c-1"]);
    expect(nota.flashcardIds).toEqual(["f-1"]);
  });
});
