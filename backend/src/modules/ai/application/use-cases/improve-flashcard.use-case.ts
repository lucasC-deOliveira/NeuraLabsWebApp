import { parseAiJson } from '../../domain/services/ai-json';
import {
  improveFlashcardMessages,
  improveMaxTokens,
  normalizeOperations,
  parseImprovedFlashcard,
  type FlashcardContent,
} from '../../domain/services/improve-flashcard';
import type { LlmPort } from '../../domain/ports/llm-port';

export interface ImproveFlashcardInput extends FlashcardContent {
  operations: unknown; // validado em normalizeOperations (borda desconfia da entrada)
}

/**
 * Melhora um flashcard com IA aplicando só as operações escolhidas (formatação,
 * estilo markdown e/ou conteúdo). Uma chamada, sem contexto do grafo — barato em
 * tokens. Devolve pergunta/resposta melhoradas; campos omitidos ficam inalterados.
 * @example improveFlashcard.execute('u1', { pergunta, resposta, operations: ['markdown'] })
 */
export class ImproveFlashcardUseCase {
  constructor(private readonly llm: LlmPort) {}

  async execute(userId: string, input: ImproveFlashcardInput): Promise<FlashcardContent> {
    const operations = normalizeOperations(input.operations);
    const content: FlashcardContent = {
      pergunta: input.pergunta ?? '',
      resposta: input.resposta ?? '',
    };
    const raw = await this.llm.complete({
      userId,
      maxTokens: improveMaxTokens(content),
      messages: improveFlashcardMessages(content, operations),
    });
    return parseImprovedFlashcard(parseAiJson(raw || '{}'), content);
  }
}
