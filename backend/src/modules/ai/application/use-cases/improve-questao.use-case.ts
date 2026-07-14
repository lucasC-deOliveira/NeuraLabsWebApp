import { parseAiJson } from '../../domain/services/ai-json';
import {
  improveQuestaoMessages,
  improveQuestaoMaxTokens,
  normalizeOperations,
  parseImprovedQuestao,
  type ImprovedQuestao,
  type QuestaoContent,
} from '../../domain/services/improve-questao';
import type { LlmPort } from '../../domain/ports/llm-port';

export interface ImproveQuestaoInput extends QuestaoContent {
  operations: unknown; // validado em normalizeOperations
}

/**
 * Melhora uma questão com IA aplicando só as operações escolhidas. Uma chamada, sem
 * contexto do grafo — barato. Preserva gabarito, letras e quantidade de alternativas;
 * campos omitidos pelo modelo ficam inalterados.
 * @example improveQuestao.execute('u1', { tipo, enunciado, alternativas, gabarito, explicacao, operations })
 */
export class ImproveQuestaoUseCase {
  constructor(private readonly llm: LlmPort) {}

  async execute(userId: string, input: ImproveQuestaoInput): Promise<ImprovedQuestao> {
    const operations = normalizeOperations(input.operations);
    const content: QuestaoContent = {
      tipo: input.tipo ?? '',
      enunciado: input.enunciado ?? '',
      alternativas: Array.isArray(input.alternativas) ? input.alternativas : [],
      gabarito: input.gabarito ?? '',
      explicacao: input.explicacao ?? '',
    };
    const raw = await this.llm.complete({
      userId,
      maxTokens: improveQuestaoMaxTokens(content),
      messages: improveQuestaoMessages(content, operations),
    });
    return parseImprovedQuestao(parseAiJson(raw || '{}'), content);
  }
}
