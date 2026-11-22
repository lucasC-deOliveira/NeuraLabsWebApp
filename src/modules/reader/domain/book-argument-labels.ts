import type { BookConnection, BookIdea } from "./book-analysis";

const roleLabel = { thesis: "Tese", argument: "Argumento", evidence: "Evidência", example: "Exemplo", objection: "Objeção" };
const kindLabel = { supports: "sustenta", illustrates: "ilustra", challenges: "contesta" };
const relationLabel = { IS_A: "é um tipo de", REFORCA: "reforça", CONTRASTA_COM: "contrasta com" };

/** Returns the editorial role the reader sees for each idea.
 * @example bookIdeaLabel(idea)
 */
export function bookIdeaLabel(idea: BookIdea): string {
  return idea.role ? roleLabel[idea.role] : idea.thesis ? "Tese" : "Conceito";
}

/** Describes evidence links using their reading intent and original direction.
 * @example bookConnectionLabel(connection)
 */
export function bookConnectionLabel(connection: BookConnection): string {
  return connection.kind ? kindLabel[connection.kind] : relationLabel[connection.type];
}
