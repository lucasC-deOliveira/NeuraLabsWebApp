import type { ParsedQuestao } from '../prova';

// Fills the deterministically parsed questions with the answer-key letters,
// merging the two zero-token parses. Annulled items get the ANULADA sentinel
// (there is no correct option) — distinct from "?" (still to be answered) so the
// review doesn't treat them as pending. Pure.

/** Applies the answer-key map to each question, by number. */
export function applyGabarito(
  questoes: ParsedQuestao[],
  gabaritos: Map<number, string>,
): ParsedQuestao[] {
  return questoes.map((questao) => {
    const answer = gabaritos.get(questao.numero);
    return answer === undefined ? questao : { ...questao, gabarito: answer };
  });
}

/** True when the answer key has an entry (answer or annulled) for every question. */
export function gabaritoCovers(questoes: ParsedQuestao[], gabaritos: Map<number, string>): boolean {
  return questoes.length > 0 && questoes.every((questao) => gabaritos.has(questao.numero));
}
