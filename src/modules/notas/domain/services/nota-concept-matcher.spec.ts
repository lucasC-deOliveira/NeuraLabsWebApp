import { NotaConceptMatcher } from "./nota-concept-matcher";

const concepts = [
  { id: "c1", nome: "Soberania" },
  { id: "c2", nome: "Federalismo" },
  { id: "c3", nome: "Princípio da Legalidade" },
];

describe("NotaConceptMatcher", () => {
  it("should match exact concept name", () => {
    const matcher = new NotaConceptMatcher(concepts);

    const result = matcher.match("Soberania");

    expect(result).toEqual({ id: "c1", nome: "Soberania" });
  });

  it("should match concept case-insensitively", () => {
    const matcher = new NotaConceptMatcher(concepts);

    const result = matcher.match("soberania");

    expect(result).toEqual({ id: "c1", nome: "Soberania" });
  });

  it("should match concept when term contains concept name", () => {
    const matcher = new NotaConceptMatcher(concepts);

    const result = matcher.match("Estudo sobre Federalismo moderno");

    expect(result).toEqual({ id: "c2", nome: "Federalismo" });
  });

  it("should match concept when concept name contains part of term", () => {
    const matcher = new NotaConceptMatcher(concepts);

    const result = matcher.match("Legalidade");

    expect(result).toEqual({ id: "c3", nome: "Princípio da Legalidade" });
  });

  it("should return null when no match found", () => {
    const matcher = new NotaConceptMatcher(concepts);

    const result = matcher.match("Conceito inexistente ABCXYZ");

    expect(result).toBeNull();
  });

  it("should return null for empty term", () => {
    const matcher = new NotaConceptMatcher(concepts);

    expect(matcher.match("")).toBeNull();
  });

  it("should batch match multiple terms", () => {
    const matcher = new NotaConceptMatcher(concepts);

    const matches = matcher.matchAll([
      "Soberania",
      "Federalismo",
      "Inexistente",
    ]);

    expect(matches.get("Soberania")?.id).toBe("c1");
    expect(matches.get("Federalismo")?.id).toBe("c2");
    expect(matches.get("Inexistente")).toBeNull();
  });
});
