import { NotaParser } from "./nota-parser";

describe("NotaParser", () => {
  it("should parse markdown-style headings as sections", () => {
    const sections = NotaParser.parse(
      "# Soberania\n\nÉ o poder supremo do Estado.\n\n# Federalismo\n\nOrganização do estado em entes.",
    );

    expect(sections.length).toBe(2);
    expect(sections[0].heading).toBe("Soberania");
    expect(sections[1].heading).toBe("Federalismo");
  });

  it("should parse ALL CAPS lines as section headings", () => {
    const sections = NotaParser.parse(
      "SOBERANIA\n\nÉ o poder supremo.\n\nFEDERALISMO\n\nOrganização do estado.",
    );

    expect(sections.length).toBe(2);
    expect(sections[0].heading).toBe("SOBERANIA");
    expect(sections[1].heading).toBe("FEDERALISMO");
  });

  it("should extract definitions from Term: Explanation pattern", () => {
    const sections = NotaParser.parse(
      "# Princípios\n\nLegalidade: só fazer o que a lei permite\nImpessoalidade: tratar todos sem distinção",
    );

    expect(sections[0].definitions.length).toBe(2);
    expect(sections[0].definitions[0].term).toBe("Legalidade");
    expect(sections[0].definitions[0].explanation).toBe(
      "só fazer o que a lei permite",
    );
    expect(sections[0].definitions[1].term).toBe("Impessoalidade");
  });

  it("should treat bullet points as section content", () => {
    const sections = NotaParser.parse(
      "# Tópicos\n- Item 1\n- Item 2\n- Item 3",
    );

    expect(sections[0].content).toEqual(["Item 1", "Item 2", "Item 3"]);
  });

  it("should treat entire text as single section if no headings found", () => {
    const sections = NotaParser.parse(
      "Este é um parágrafo simples sem títulos.",
    );

    expect(sections.length).toBe(1);
    expect(sections[0].heading).toBe("Nota");
  });

  it("should handle empty input", () => {
    const sections = NotaParser.parse("");

    expect(sections.length).toBe(1);
    expect(sections[0].heading).toBe("Nota");
    expect(sections[0].hasContent()).toBe(false);
  });

  it("should skip empty lines", () => {
    const sections = NotaParser.parse(
      "# Título\n\n\n\nConteúdo após linhas vazias",
    );

    expect(sections.length).toBe(1);
    expect(sections[0].content).toContain("Conteúdo após linhas vazias");
  });
});
