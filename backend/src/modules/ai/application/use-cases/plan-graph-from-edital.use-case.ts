import { EmptyAiContentError, EmptyTextError } from '../../domain/errors';
import { parseAiJson } from '../../domain/services/ai-json';
import { extractEditalSyllabus } from '../../domain/services/extract-edital-syllabus';
import {
  editalPlanMessages,
  normalizeEditalPlan,
  type EditalPlan,
} from '../../domain/services/edital-plan';
import type { GraphNameIndexRepository } from '../../domain/ports/graph-name-index-repository';
import type { LlmPort } from '../../domain/ports/llm-port';

/**
 * Stage 1 of edital-driven graph completion: isolates the notice's content program
 * and asks the model for a plan that mirrors the edital's hierarchy (disciplina→
 * assunto, tópico→tópico, subitem→conceito), reusing existing nodes so only the
 * missing ones get built. No persistence — the plan is fed to BuildGraphFromEdital.
 * @example planGraphFromEdital.execute('u1', 'g1', editalPdfText)
 */
export class PlanGraphFromEditalUseCase {
  constructor(
    private readonly names: GraphNameIndexRepository,
    private readonly llm: LlmPort,
  ) {}

  async execute(
    userId: string,
    grafoId: string,
    editalText: string,
  ): Promise<{ plan: EditalPlan; programa: string }> {
    const syllabus = extractEditalSyllabus(editalText);
    if (!syllabus) throw new EmptyTextError();
    const { existingContext } = await this.names.loadNameIndex(userId, grafoId);
    const content = await this.llm.complete({
      userId,
      maxTokens: 6000,
      messages: editalPlanMessages(syllabus, existingContext),
    });
    if (!content) throw new EmptyAiContentError();
    // programa is the isolated syllabus — stored on the Edital entity when linked.
    return { plan: normalizeEditalPlan(parseAiJson(content)), programa: syllabus };
  }
}
