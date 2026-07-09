import type { ParsedQuestao, QuestaoConceitoLink } from '../prova';

/**
 * Pairs each persisted question id (in the order it was created) with the
 * concepts confirmed for it, dropping questions with no concepts. Pure.
 * @example buildQuestaoConceitoLinks(input.questoes, questaoIds)
 */
export function buildQuestaoConceitoLinks(
  questoes: ParsedQuestao[],
  questaoIds: string[],
): QuestaoConceitoLink[] {
  const links: QuestaoConceitoLink[] = [];
  questoes.forEach((questao, i) => {
    const conceitos = questao.conceitos ?? [];
    if (conceitos.length > 0 && questaoIds[i]) {
      links.push({ questaoId: questaoIds[i], conceitos });
    }
  });
  return links;
}
