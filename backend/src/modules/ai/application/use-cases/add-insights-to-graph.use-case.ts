import { AiNodeNotFoundError } from '../../domain/errors';
import type {
  InsightTargetContext,
  InsightTargetIndexRepository,
} from '../../domain/ports/insight-target-index-repository';
import type { GraphNodeWriter } from '../../domain/ports/graph-node-writer';
import type { GraphEdgeInput, GraphEdgeWriter } from '../../domain/ports/graph-edge-writer';
import type { RelationRulesPort } from '../../domain/ports/relation-rules-port';

export interface InsightToAdd {
  tipoNo: string;
  relacao: string;
  titulo: string;
  descricao?: string;
}

/**
 * Materializes accepted insights as graph nodes/edges: reuses an existing node by
 * name or creates it, then links it to the source in the canonical direction.
 * @example addInsights.execute('u1', 'g1', 'src', [{ tipoNo, relacao, titulo }])
 */
export class AddInsightsToGraphUseCase {
  constructor(
    private readonly repo: InsightTargetIndexRepository,
    private readonly nodeWriter: GraphNodeWriter,
    private readonly edgeWriter: GraphEdgeWriter,
    private readonly rules: RelationRulesPort,
  ) {}

  async execute(
    userId: string,
    grafoId: string,
    sourceNodeId: string,
    insights: InsightToAdd[],
  ): Promise<{ added: number }> {
    const ctx = await this.repo.loadInsightTargetContext(userId, grafoId, sourceNodeId);
    if (!ctx) throw new AiNodeNotFoundError();
    let added = 0;
    for (const ins of insights) {
      if (await this.applyInsight(userId, grafoId, sourceNodeId, ctx, ins)) added++;
    }
    return { added };
  }

  private async applyInsight(
    userId: string,
    grafoId: string,
    sourceNodeId: string,
    ctx: InsightTargetContext,
    ins: InsightToAdd,
  ): Promise<boolean> {
    const titulo = (ins.titulo ?? '').trim();
    if (!titulo) return false;
    if (!this.rules.isRelationAllowed(ctx.sourceType, ins.tipoNo, ins.relacao)) return false;
    const dir = this.rules.canonicalDirection(ctx.sourceType, ins.tipoNo, ins.relacao);
    if (!dir) return false;
    const targetRef = await this.resolveTarget(userId, grafoId, ctx, ins, titulo);
    const edge = orientEdge(sourceNodeId, targetRef, dir[0] === ctx.sourceType, ins.relacao);
    return this.tryCreateEdge(userId, grafoId, edge);
  }

  private async resolveTarget(
    userId: string,
    grafoId: string,
    ctx: InsightTargetContext,
    ins: InsightToAdd,
    titulo: string,
  ): Promise<string> {
    const key = `${ins.tipoNo}|${titulo.toLowerCase()}`;
    const existing = ctx.nameIndex.get(key);
    if (existing) return existing;
    const { nodeId } = await this.nodeWriter.createNode(userId, grafoId, {
      tipoNode: ins.tipoNo,
      nome: titulo,
      descricao: ins.descricao ?? '',
    });
    ctx.nameIndex.set(key, nodeId);
    return nodeId;
  }

  private async tryCreateEdge(
    userId: string,
    grafoId: string,
    edge: GraphEdgeInput,
  ): Promise<boolean> {
    try {
      await this.edgeWriter.createEdge(userId, grafoId, edge);
      return true;
    } catch {
      // duplicate/invalid edge: skip it
      return false;
    }
  }
}

// Orients the edge so the source node is the origin only when its type leads the
// canonical direction; otherwise the created node is the origin.
function orientEdge(
  sourceNodeId: string,
  targetRef: string,
  sourceIsOrigem: boolean,
  tipoRelacao: string,
): GraphEdgeInput {
  return {
    sourceNodeId: sourceIsOrigem ? sourceNodeId : targetRef,
    targetNodeId: sourceIsOrigem ? targetRef : sourceNodeId,
    tipoRelacao,
  };
}
