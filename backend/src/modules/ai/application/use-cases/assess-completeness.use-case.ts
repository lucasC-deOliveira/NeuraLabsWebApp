import { parseAiJson } from '../../domain/services/ai-json';
import { buildAssessmentContext } from '../../domain/services/assessment-context';
import {
  selectCompletenessAssessments,
  type CompletenessAssessment,
  type RawAssessment,
} from '../../domain/services/completeness-assessment';
import type { CompletenessRepository } from '../../domain/ports/completeness-repository';
import type { LlmMessage, LlmPort } from '../../domain/ports/llm-port';

const SYSTEM_PROMPT =
  'Avalie a COMPLETUDE do conhecimento para cada ASSUNTO listado com seus tópicos e conceitos. ' +
  'Score 0-10. Responda JSON: {"assessments":[{"assuntoNome":"nome exato do assunto","score":7,"wellCovered":["tópico/conceito bem coberto"],"shallow":["área presente mas rasa"],"missing":["conceito importante AUSENTE"]}]} — ' +
  'wellCovered/shallow/missing: máx 6 itens cada, strings curtas. Use o nome exato do assunto no campo assuntoNome.';

/**
 * Assesses the completeness of each subject in a graph (score + covered/shallow/
 * missing areas). Invalid model output yields no assessments.
 * @example assessCompleteness.execute('u1', 'g1')
 */
export class AssessCompletenessUseCase {
  constructor(
    private readonly repo: CompletenessRepository,
    private readonly llm: LlmPort,
  ) {}

  async execute(
    userId: string,
    grafoId: string,
  ): Promise<{ assessments: CompletenessAssessment[] }> {
    const data = await this.repo.loadAssessmentData(userId, grafoId);
    if (data.assuntos.length === 0) return { assessments: [] };
    const ctx = buildAssessmentContext(data);
    const content = await this.llm.complete({ userId, messages: buildMessages(ctx) });
    return { assessments: this.parseAssessments(content, data.assuntos) };
  }

  private parseAssessments(
    content: string,
    assuntos: { id: string; nome: string }[],
  ): CompletenessAssessment[] {
    try {
      const parsed = parseAiJson(content || '{}') as { assessments?: RawAssessment[] };
      return selectCompletenessAssessments(parsed?.assessments ?? [], assuntos);
    } catch {
      return [];
    }
  }
}

function buildMessages(ctx: string): LlmMessage[] {
  return [
    { role: 'system', content: SYSTEM_PROMPT },
    { role: 'user', content: `GRAFO:\n${ctx.slice(0, 8000)}` },
  ];
}
