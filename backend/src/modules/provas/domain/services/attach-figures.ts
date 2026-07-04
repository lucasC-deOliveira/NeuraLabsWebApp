import type { ParsedImagem, ParsedQuestao } from '../prova';
import type { ExamPageLayout } from '../ports/exam-figure-source';
import { associateFigures } from './associate-figures';

// Bridges the extracted PDF layout onto the parsed questions: attributes each
// figure to its question (associate-figures) and attaches it base64-encoded, so
// the figures travel with the questions through the parse → review → create flow.

function groupByNumero(pages: ExamPageLayout[]): Map<number, ParsedImagem[]> {
  const byNumero = new Map<number, ParsedImagem[]>();
  for (const { numero, alternativa, figure } of associateFigures(pages)) {
    const list = byNumero.get(numero) ?? [];
    list.push({ mimetype: figure.mimetype, base64: figure.bytes.toString('base64'), alternativa });
    byNumero.set(numero, list);
  }
  return byNumero;
}

/**
 * Returns the questions with their figures attached (matched by question number).
 * Questions without figures are returned unchanged.
 * @example attachFiguresToQuestoes(upload.questoes, layout.pages)
 */
export function attachFiguresToQuestoes(
  questoes: ParsedQuestao[],
  pages: ExamPageLayout[],
): ParsedQuestao[] {
  const byNumero = groupByNumero(pages);
  return questoes.map((questao) => {
    const imagens = byNumero.get(questao.numero);
    return imagens ? { ...questao, imagens } : questao;
  });
}
