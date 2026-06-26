import { describe, it, expect } from 'vitest';
import { AddMissingPrerequisiteUseCase } from './add-missing-prerequisite.use-case';
import type { GraphNodeInput, GraphNodeWriter } from '../../domain/ports/graph-node-writer';
import type { GraphEdgeInput, GraphEdgeWriter } from '../../domain/ports/graph-edge-writer';
import type { NodeTypesRepository } from '../../domain/ports/node-types-repository';

class FakeNodeWriter implements GraphNodeWriter {
  lastInput: GraphNodeInput | null = null;
  async createNode(_u: string, _g: string, input: GraphNodeInput): Promise<{ nodeId: string }> {
    this.lastInput = input;
    return { nodeId: 'new-node' };
  }
}

class FakeEdgeWriter implements GraphEdgeWriter {
  readonly created: GraphEdgeInput[] = [];
  async createEdge(_u: string, _g: string, edge: GraphEdgeInput): Promise<void> {
    this.created.push(edge);
  }
}

class FakeTypes implements NodeTypesRepository {
  constructor(private readonly map: Map<string, string>) {}
  async loadNodeTypes(): Promise<Map<string, string>> {
    return this.map;
  }
}

describe('AddMissingPrerequisiteUseCase', () => {
  it('creates the node and links it with the right prerequisite relation', async () => {
    const nodeWriter = new FakeNodeWriter();
    const edgeWriter = new FakeEdgeWriter();
    const types = new FakeTypes(new Map([['c1', 'CONCEITO']]));
    const useCase = new AddMissingPrerequisiteUseCase(nodeWriter, edgeWriter, types);

    const res = await useCase.execute('u1', 'g1', 'Base', 'CONCEITO', ['c1']);

    expect(res).toEqual({ nodeId: 'new-node' });
    expect(nodeWriter.lastInput).toEqual({ tipoNode: 'CONCEITO', nome: 'Base', descricao: '' });
    expect(edgeWriter.created).toEqual([
      { sourceNodeId: 'new-node', targetNodeId: 'c1', tipoRelacao: 'PREREQUISITO' },
    ]);
  });

  it('skips targets that are absent or have no applicable relation', async () => {
    const edgeWriter = new FakeEdgeWriter();
    const types = new FakeTypes(new Map([['c1', 'CONCEITO']]));
    const useCase = new AddMissingPrerequisiteUseCase(new FakeNodeWriter(), edgeWriter, types);

    await useCase.execute('u1', 'g1', 'Base', 'CONCEITO', ['c1', 'ghost']);

    expect(edgeWriter.created).toHaveLength(1);
  });
});
