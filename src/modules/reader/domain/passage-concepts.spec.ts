import { expect, it } from "vitest";
import { findPassageConcepts } from "./passage-concepts";

it("matches full names across accents and punctuation, without matching substrings", () => {
  const concepts = [
    { id: "bio", label: "Bio" },
    { id: "carbon", label: "Carbono" },
    { id: "cycle", label: "Ciclo do carbono" },
    { id: "climate", label: "Clima" },
  ];
  expect(findPassageConcepts("O CICLO do carbôno afeta biologia e microclimas.", concepts).map(({ id }) => id))
    .toEqual(["cycle", "carbon"]);
});

it("limits displayed concepts to five", () => {
  const concepts = Array.from({ length: 8 }, (_, index) => ({ id: String(index), label: `Conceito ${index}` }));
  expect(findPassageConcepts(concepts.map(({ label }) => label).join(", "), concepts)).toHaveLength(5);
});
