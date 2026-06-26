import { describe, it, expect } from 'vitest';
import { AddInsightsToGraphUseCase } from './add-insights-to-graph.use-case';
import { AiNodeNotFoundError } from '../../domain/errors';
import type {
  InsightTargetContext,
  InsightTargetIndexRepository,
} from '../../domain/ports/insight-target-index-repository';
import type { GraphNodeInput, GraphNodeWriter } from '../../domain/ports/graph-node-writer';
import type { GraphEdgeInput, GraphEdgeWriter } from '../../domain/ports/graph-edge-writer';
import type { RelationRulesPort } from '../../domain/ports/relation-rules-port';

class FakeRepo implements InsightTargetIndexRepository {
  constructor(private readonly ctx: InsightTargetContext | null) {}
  async loadInsightTargetContext(): Promise<InsightTargetContext | null> {
    return this.ctx;
  }
}

class FakeNodeWriter implements GraphNodeWriter {
  readonly created: GraphNodeInput[] = [];
  async createNode(_u: string, _g: string, input: GraphNodeInput): Promise<{ nodeId: string }> {
    this.created.push(input);
    return { nodeId: `node-${this.created.length}` };
  }
}

class FakeEdgeWriter implements GraphEdgeWriter {
  readonly created: GraphEdgeInput[] = [];
  async createEdge(_u: string, _g: string, edge: GraphEdgeInput): Promise<void> {
    this.created.push(edge);
  }
}

// CONCEITO→CONCEITO PREREQUISITO, canonical direction [CONCEITO, CONCEITO].
const rules: RelationRulesPort = {
  allowedNotaRelations: () => [],
  isNotaRelationAllowed: () => true,
  isRelationAllowed: (_s, _t, relacao) => relacao === 'PREREQUISITO',
  insightTargets: () => [],
  canonicalDirection: (a, b, relacao) => (relacao === 'PREREQUISITO' ? [a, b] : null),
};

describe('AddInsightsToGraphUseCase', () => {
  const ctx = (): InsightTargetContext => ({ sourceType: 'CONCEITO', nameIndex: new Map() });

  it('throws when the source node is absent', async () => {
    const useCase = new AddInsightsToGraphUseCase(
      new FakeRepo(null),
      new FakeNodeWriter(),
      new FakeEdgeWriter(),
      rules,
    );
    await expect(useCase.execute('u1', 'g1', 'src', [])).rejects.toBeInstanceOf(
      AiNodeNotFoundError,
    );
  });

  it('creates the target node and links it, skipping invalid insights', async () => {
    const nodeWriter = new FakeNodeWriter();
    const edgeWriter = new FakeEdgeWriter();
    const useCase = new AddInsightsToGraphUseCase(
      new FakeRepo(ctx()),
      nodeWriter,
      edgeWriter,
      rules,
    );

    const res = await useCase.execute('u1', 'g1', 'src', [
      { tipoNo: 'CONCEITO', relacao: 'NOPE', titulo: 'X' },
      { tipoNo: 'CONCEITO', relacao: 'PREREQUISITO', titulo: '  ' },
      { tipoNo: 'CONCEITO', relacao: 'PREREQUISITO', titulo: 'Base', descricao: 'd' },
    ]);

    expect(res).toEqual({ added: 1 });
    expect(nodeWriter.created).toEqual([{ tipoNode: 'CONCEITO', nome: 'Base', descricao: 'd' }]);
    expect(edgeWriter.created).toEqual([
      { sourceNodeId: 'src', targetNodeId: 'node-1', tipoRelacao: 'PREREQUISITO' },
    ]);
  });

  it('reuses an existing node from the name index instead of creating one', async () => {
    const existing = ctx();
    existing.nameIndex.set('CONCEITO|base', 'ref-existing');
    const nodeWriter = new FakeNodeWriter();
    const edgeWriter = new FakeEdgeWriter();
    const useCase = new AddInsightsToGraphUseCase(
      new FakeRepo(existing),
      nodeWriter,
      edgeWriter,
      rules,
    );

    await useCase.execute('u1', 'g1', 'src', [
      { tipoNo: 'CONCEITO', relacao: 'PREREQUISITO', titulo: 'Base' },
    ]);

    expect(nodeWriter.created).toHaveLength(0);
    expect(edgeWriter.created[0]?.targetNodeId).toBe('ref-existing');
  });
});
