import type { ProvaRepository } from '../../domain/ports/prova-repository';
import type { QuestaoGraphWriter } from '../../domain/ports/questao-graph-writer';
import type { CreateProvaFromParsedInput } from '../../domain/prova';
import { buildQuestaoConceitoLinks } from '../../domain/services/build-questao-conceito-links';

/**
 * Persists exam questions parsed from an upload, then the exam that links them.
 * When a target `grafoId` is given, also links each question into the knowledge
 * graph using the concepts confirmed in the review (QUESTION node → TESTA edges).
 * @example createProvaFromParsed.execute('u1', { titulo, questoes: [...] })
 * @example createProvaFromParsed.execute('u1', { titulo, questoes, grafoId: 'g1' })
 */
export class CreateProvaFromParsedUseCase {
  constructor(
    private readonly repo: ProvaRepository,
    private readonly graphWriter?: QuestaoGraphWriter,
  ) {}

  async execute(userId: string, input: CreateProvaFromParsedInput): Promise<{ provaId: string }> {
    const { provaId, questaoIds } = await this.repo.createFromParsed(userId, input);
    await this.linkToGrafo(userId, input, questaoIds);
    return { provaId };
  }

  private async linkToGrafo(
    userId: string,
    input: CreateProvaFromParsedInput,
    questaoIds: string[],
  ): Promise<void> {
    if (!input.grafoId || !this.graphWriter) return;
    const links = buildQuestaoConceitoLinks(input.questoes, questaoIds);
    if (links.length > 0) await this.graphWriter.linkQuestoesToGrafo(userId, input.grafoId, links);
  }
}
