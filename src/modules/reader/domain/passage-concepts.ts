import type { ReaderGraphConcept } from "@/lib/reader-graph-context";

function passageWords(text: string): string {
  return text.normalize("NFD").replace(/\p{M}/gu, "").toLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, " ").trim();
}

/** Finds named graph concepts mentioned in the passage, longest names first.
 * @example findPassageConcepts("The Paris Agreement", [{ id: "p", label: "Paris Agreement" }])
 */
export function findPassageConcepts(passage: string, concepts: readonly ReaderGraphConcept[]): ReaderGraphConcept[] {
  const text = ` ${passageWords(passage)} `;
  return concepts.map((concept) => ({ concept, name: passageWords(concept.label) }))
    .filter(({ name }) => name.length >= 3 && text.includes(` ${name} `))
    .sort((left, right) => right.name.length - left.name.length || left.concept.label.localeCompare(right.concept.label))
    .slice(0, 5).map(({ concept }) => concept);
}
