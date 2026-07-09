import type { ParsedQuestao } from '../prova';

/**
 * Merges the deterministically parsed questions with the ones the LLM recovered
 * from the surgical fallback. Deterministic wins on number conflicts (it is a
 * faithful transcription of the text), and the result is ordered by number.
 * @example mergeQuestoes(deterministic, llmRecovered)
 */
export function mergeQuestoes(base: ParsedQuestao[], extra: ParsedQuestao[]): ParsedQuestao[] {
  const byNumero = new Map<number, ParsedQuestao>();
  for (const questao of extra) byNumero.set(questao.numero, questao);
  for (const questao of base) byNumero.set(questao.numero, questao);
  return [...byNumero.values()].sort((a, b) => a.numero - b.numero);
}
