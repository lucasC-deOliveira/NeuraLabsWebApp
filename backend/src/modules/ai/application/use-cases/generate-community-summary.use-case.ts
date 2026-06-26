import { EmptyClusterContentError, EmptyNodeListError } from '../../domain/errors';
import { parseAiJson } from '../../domain/services/ai-json';
import { buildClusterContext } from '../../domain/services/cluster-context';
import { parseClusterSummary } from '../../domain/services/cluster-summary';
import type { ClusterNodesRepository } from '../../domain/ports/cluster-nodes-repository';
import type { LlmMessage, LlmPort } from '../../domain/ports/llm-port';

const SYSTEM_PROMPT =
  'Gere um RESUMO DE ESTUDO coerente em Markdown (200-500 palavras) dos nós de um cluster. ' +
  'Explique os conceitos de forma conectada, não apenas liste. JSON: {"titulo":"...","resumo":"(Markdown)"}';

/**
 * Generates a coherent study summary (title + Markdown) for a cluster of nodes.
 * @example communitySummary.execute('u1', 'g1', ['ref1', 'ref2'])
 */
export class GenerateCommunitySummaryUseCase {
  constructor(
    private readonly repo: ClusterNodesRepository,
    private readonly llm: LlmPort,
  ) {}

  async execute(
    userId: string,
    grafoId: string,
    nodeIds: string[],
  ): Promise<{ titulo: string; resumo: string }> {
    if (nodeIds.length === 0) throw new EmptyNodeListError();
    const nodes = await this.repo.loadClusterContent(userId, grafoId, nodeIds);
    const ctx = buildClusterContext(nodes);
    if (!ctx.trim()) throw new EmptyClusterContentError();
    const content = await this.llm.complete({ userId, messages: buildMessages(ctx) });
    return parseClusterSummary(parseAiJson(content || '{}'));
  }
}

function buildMessages(ctx: string): LlmMessage[] {
  return [
    { role: 'system', content: SYSTEM_PROMPT },
    { role: 'user', content: `NÓDES DO CLUSTER:\n${ctx.slice(0, 8000)}` },
  ];
}
