import type { ExamLlmPort } from '../../domain/ports/exam-llm';
import type { ConceitoCatalogSource } from '../../domain/ports/conceito-catalog-source';
import type { ParsedQuestao, QuestaoConceitos } from '../../domain/prova';
import { buildConceitoClassificationPrompt } from '../../domain/services/build-conceito-classification-prompt';
import { resolveConceitoSuggestions } from '../../domain/services/resolve-conceito-suggestions';

// Low temperature: classifying a question by concept is a judgement over fixed
// content, not creative writing.
const CLASSIFY_TEMPERATURE = 0.2;

/**
 * Suggests, per question, the graph CONCEITOs it tests — reusing the user's
 * existing nodes and proposing new ones where needed. One batched LLM call.
 * The review UI then lets the user confirm before the links are written.
 * @example suggestQuestaoConceitos.execute('u1', parsed.questoes)
 */
export class SuggestQuestaoConceitosUseCase {
  constructor(
    private readonly catalog: ConceitoCatalogSource,
    private readonly llm: ExamLlmPort,
  ) {}

  async execute(userId: string, questoes: ParsedQuestao[]): Promise<QuestaoConceitos[]> {
    if (questoes.length === 0) return [];
    const catalogo = await this.catalog.loadCatalogo(userId);
    const messages = buildConceitoClassificationPrompt(questoes, catalogo);
    const content = await this.llm.complete({
      userId,
      messages,
      temperature: CLASSIFY_TEMPERATURE,
    });
    return resolveConceitoSuggestions(content, catalogo);
  }
}
