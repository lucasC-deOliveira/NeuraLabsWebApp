import type { CatalogoConceitos, ParsedQuestao } from '../prova';
import type { ExamLlmMessage } from '../ports/exam-llm';
import { catalogoPromptFragment } from './conceito-catalog';

// Builds the prompt that tags each exam question with the CONCEITOs it tests,
// grounded in the user's existing graph nodes (reuse over duplication). One
// batched call for the whole exam; only stems are sent (truncated) to keep tokens
// low — this is classification, not generation.

const STEM_CHAR_LIMIT = 280;

const INSTRUCTIONS = `Você classifica questões de prova pelos CONCEITOS do grafo de conhecimento do usuário.
Para cada questão (identificada pelo número), liste os conceitos que ela avalia.
- Uma questão pode ser multidisciplinar: use mais de um conceito quando fizer sentido.
- Reutilize EXATAMENTE os nomes de conceitos já existentes quando forem adequados.
- Quando o conceito não existir, proponha um nome curto e específico (2 a 4 palavras).
Retorne JSON: {"questoes":[{"numero":91,"conceitos":["Nome do conceito"]}]}`;

/**
 * @example buildConceitoClassificationPrompt(questoes, catalogo)
 */
export function buildConceitoClassificationPrompt(
  questoes: ParsedQuestao[],
  catalogo: CatalogoConceitos,
): ExamLlmMessage[] {
  const catalog = catalogoPromptFragment(catalogo);
  const lista = questoes.map(stemLine).join('\n');
  const content = [INSTRUCTIONS, catalog, `QUESTÕES:\n${lista}`]
    .filter((s) => s !== '')
    .join('\n\n');
  return [{ role: 'user', content }];
}

function stemLine(questao: ParsedQuestao): string {
  return `[${questao.numero}] ${questao.enunciado.slice(0, STEM_CHAR_LIMIT)}`;
}
