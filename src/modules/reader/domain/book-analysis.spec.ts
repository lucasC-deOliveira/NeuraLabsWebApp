import { expect, it } from "vitest";
import { analyzeBookSections } from "./book-analysis";

it("keeps explicit claims with their original section and deduplicates repeated ideas", () => {
  const result = analyzeBookSections([
    "## Páginas 1–30\n\nA tese central é que a revisão melhora o aprendizado.\n\nMitose é uma divisão celular.",
    "## Páginas 31–50\n\nMitose é uma divisão celular. Mitose contrasta com meiose.",
  ]);
  expect(result.ideas.filter(({ key }) => key === "mitose")).toHaveLength(1);
  expect(result.ideas.find(({ thesis }) => thesis)).toMatchObject({ section: 0, title: "a revisão melhora o aprendizado" });
  expect(result.connections).toEqual([
    { from: "mitose", to: "divisão celular", type: "IS_A", section: 0, quote: "Mitose é uma divisão celular." },
    { from: "mitose", to: "meiose", type: "CONTRASTA_COM", section: 1, quote: "Mitose contrasta com meiose." },
  ]);
});

it("leaves prose without an explicit supported claim out of the draft", () => {
  expect(analyzeBookSections(["The narrator walked home."])).toEqual({ ideas: [], connections: [] });
});
