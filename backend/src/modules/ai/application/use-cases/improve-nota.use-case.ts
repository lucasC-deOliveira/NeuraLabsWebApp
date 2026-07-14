import { parseAiJson } from '../../domain/services/ai-json';
import {
  improveNotaMessages,
  improveNotaMaxTokens,
  normalizeOperations,
  parseImprovedNota,
  type NotaContent,
} from '../../domain/services/improve-nota';
import type { LlmPort } from '../../domain/ports/llm-port';

export interface ImproveNotaInput extends NotaContent {
  operations: unknown; // validado em normalizeOperations
}

/**
 * Melhora uma nota com IA aplicando só as operações escolhidas. Uma chamada, sem
 * contexto do grafo — barato. Devolve título/conteúdo melhorados; campos omitidos
 * ficam inalterados.
 * @example improveNota.execute('u1', { titulo, conteudo, operations: ['markdown'] })
 */
export class ImproveNotaUseCase {
  constructor(private readonly llm: LlmPort) {}

  async execute(userId: string, input: ImproveNotaInput): Promise<NotaContent> {
    const operations = normalizeOperations(input.operations);
    const content: NotaContent = {
      titulo: input.titulo ?? '',
      conteudo: input.conteudo ?? '',
    };
    const raw = await this.llm.complete({
      userId,
      maxTokens: improveNotaMaxTokens(content),
      messages: improveNotaMessages(content, operations),
    });
    return parseImprovedNota(parseAiJson(raw || '{}'), content);
  }
}
