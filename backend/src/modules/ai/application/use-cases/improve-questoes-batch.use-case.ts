import { parseAiJson } from '../../domain/services/ai-json';
import {
  improveProvaQuestoesMessages,
  improveProvaQuestoesMaxTokens,
  normalizeOperations,
  parseImprovedProvaQuestoes,
  type BatchQuestao,
  type ImprovedBatchQuestao,
} from '../../domain/services/improve-questoes-batch';
import type { LlmPort } from '../../domain/ports/llm-port';

export interface ImproveProvaQuestoesInput {
  questoes: BatchQuestao[];
  operations: unknown;
}

/**
 * Melhora TODAS as questões de uma prova numa única chamada (usado na importação).
 * Preserva numero/gabarito/letras; barato por ser um só request. Lista vazia → [].
 * @example improveProvaQuestoes.execute('u1', { questoes, operations: ['markdown'] })
 */
export class ImproveProvaQuestoesUseCase {
  constructor(private readonly llm: LlmPort) {}

  async execute(userId: string, input: ImproveProvaQuestoesInput): Promise<ImprovedBatchQuestao[]> {
    const questoes = Array.isArray(input.questoes) ? input.questoes : [];
    if (questoes.length === 0) return [];
    const operations = normalizeOperations(input.operations);
    const raw = await this.llm.complete({
      userId,
      maxTokens: improveProvaQuestoesMaxTokens(questoes),
      messages: improveProvaQuestoesMessages(questoes, operations),
    });
    return parseImprovedProvaQuestoes(parseAiJson(raw || '{}'), questoes);
  }
}
