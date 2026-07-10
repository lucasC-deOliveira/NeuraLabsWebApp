import { describe, it, expect } from 'vitest';
import { BuildGraphFromEditalUseCase } from './build-graph-from-edital.use-case';
import type { GraphNameIndexRepository } from '../../domain/ports/graph-name-index-repository';
import type { GraphNodeInput, GraphNodeWriter } from '../../domain/ports/graph-node-writer';
import type { GraphEdgeInput, GraphEdgeWriter } from '../../domain/ports/graph-edge-writer';

class FakeNames implements GraphNameIndexRepository {
  constructor(private readonly seed: Array<[string, string]> = []) {}
  async loadNameIndex(): Promise<{ nameIndex: Map<string, string>; existingContext: string }> {
    return { nameIndex: new Map(this.seed), existingContext: '' };
  }
}

class FakeNodeWriter implements GraphNodeWriter {
  readonly created: GraphNodeInput[] = [];
  async createNode(_u: string, _g: string, input: GraphNodeInput): Promise<{ nodeId: string }> {
    this.created.push(input);
    return { nodeId: `n${this.created.length}` };
  }
}

class FakeEdgeWriter implements GraphEdgeWriter {
  readonly created: GraphEdgeInput[] = [];
  async createEdge(_u: string, _g: string, edge: GraphEdgeInput): Promise<void> {
    this.created.push(edge);
  }
}

const plan = {
  assuntos: [
    {
      nome: 'Língua Portuguesa',
      topicos: [{ nome: 'Coesão', conceitos: ['Referenciação', 'Conectores'] }],
    },
  ],
};

describe('BuildGraphFromEditalUseCase', () => {
  it('creates ASSUNTO/TÓPICO/CONCEITO with PERTENCE_A edges and reports new counts', async () => {
    const nodeWriter = new FakeNodeWriter();
    const edgeWriter = new FakeEdgeWriter();
    const useCase = new BuildGraphFromEditalUseCase(new FakeNames(), nodeWriter, edgeWriter);

    const res = await useCase.execute('u1', 'g1', plan);

    // conceitoNodeIds lists the concept node ids (created + reused) so the caller can
    // link the EDITAL node to them (COBRE edges).
    expect(res).toEqual({ assuntos: 1, topicos: 1, conceitos: 2, conceitoNodeIds: ['n3', 'n4'] });
    expect(nodeWriter.created.map((n) => n.tipoNode)).toEqual([
      'ASSUNTO',
      'TOPICO',
      'CONCEITO',
      'CONCEITO',
    ]);
    // Every child links up to its parent.
    expect(edgeWriter.created).toHaveLength(3);
    expect(edgeWriter.created.every((e) => e.tipoRelacao === 'PERTENCE_A')).toBe(true);
  });

  it('reuses an existing node by name instead of creating a duplicate', async () => {
    const nodeWriter = new FakeNodeWriter();
    const useCase = new BuildGraphFromEditalUseCase(
      // key is accent-folded by node-name-key: "Língua Portuguesa" → "assunto|lingua portuguesa".
      new FakeNames([['ASSUNTO|lingua portuguesa', 'existing-assunto']]),
      nodeWriter,
      new FakeEdgeWriter(),
    );

    const res = await useCase.execute('u1', 'g1', plan);

    expect(res.assuntos).toBe(0); // reused, not created
    expect(nodeWriter.created.map((n) => n.tipoNode)).toEqual(['TOPICO', 'CONCEITO', 'CONCEITO']);
    expect(res.conceitoNodeIds).toEqual(['n2', 'n3']); // both concept nodes, regardless of reuse
  });
});
