import { EmptyAiContentError, EmptyTextError } from '../../domain/errors';
import { parseAiJson } from '../../domain/services/ai-json';
import { graphPlanMessages } from './plan-graph-from-text.use-case';
import { BuildGraphFromPlanUseCase, type BuildGraphResult } from './build-graph-from-plan.use-case';
import type { GraphNameIndexRepository } from '../../domain/ports/graph-name-index-repository';
import type { LlmPort } from '../../domain/ports/llm-port';

/**
 * Generates a full graph from raw text in one shot: asks the model for a plan and
 * persists it (kept for compatibility with the single-call endpoint).
 * @example generateGraph.execute('u1', 'g1', 'texto bruto...')
 */
export class GenerateGraphFromTextUseCase {
  constructor(
    private readonly names: GraphNameIndexRepository,
    private readonly llm: LlmPort,
    private readonly builder: BuildGraphFromPlanUseCase,
  ) {}

  async execute(userId: string, grafoId: string, rawText: string): Promise<BuildGraphResult> {
    if (!rawText.trim()) throw new EmptyTextError();
    const { existingContext } = await this.names.loadNameIndex(userId, grafoId);
    const content = await this.llm.complete({
      userId,
      messages: graphPlanMessages(rawText, existingContext),
    });
    if (!content) throw new EmptyAiContentError();
    return this.builder.execute(userId, grafoId, rawText, parseAiJson(content), true);
  }
}
