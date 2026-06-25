import { describe, it, expect } from 'vitest';
import { ExpandNodeUseCase } from './expand-node.use-case';
import { AiNodeNotFoundError, UnsupportedExpandTypeError } from '../../domain/errors';
import type {
  ExpandTarget,
  ExpandTargetRepository,
} from '../../domain/ports/expand-target-repository';
import type { GraphNameIndexRepository } from '../../domain/ports/graph-name-index-repository';
import type { GraphNodeInput, GraphNodeWriter } from '../../domain/ports/graph-node-writer';
import type { GraphEdgeInput, GraphEdgeWriter } from '../../domain/ports/graph-edge-writer';
import type { LlmPort } from '../../domain/ports/llm-port';

class FakeTargets implements ExpandTargetRepository {
  constructor(private readonly target: ExpandTarget | null) {}
  async loadExpandTarget(): Promise<ExpandTarget | null> {
    return this.target;
  }
}

class FakeNames implements GraphNameIndexRepository {
  constructor(private readonly index = new Map<string, string>()) {}
  async loadNameIndex(): Promise<{ nameIndex: Map<string, string>; existingContext: string }> {
    return { nameIndex: this.index, existingContext: '' };
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

class FakeLlm implements LlmPort {
  constructor(private readonly response: string) {}
  async complete(): Promise<string> {
    return this.response;
  }
}

const build = (target: ExpandTarget | null, llm: LlmPort, names = new FakeNames()) => {
  const nodeWriter = new FakeNodeWriter();
  const edgeWriter = new FakeEdgeWriter();
  const useCase = new ExpandNodeUseCase(
    new FakeTargets(target),
    names,
    nodeWriter,
    edgeWriter,
    llm,
  );
  return { useCase, nodeWriter, edgeWriter };
};

describe('ExpandNodeUseCase', () => {
  it('throws when the target node is not in the graph', async () => {
    const { useCase } = build(null, new FakeLlm('{}'));
    await expect(useCase.execute('u1', 'g1', 'x')).rejects.toBeInstanceOf(AiNodeNotFoundError);
  });

  it('rejects an unsupported node type', async () => {
    const { useCase } = build({ tipo: 'FLASHCARD', nome: 'X', desc: '' }, new FakeLlm('{}'));
    await expect(useCase.execute('u1', 'g1', 'x')).rejects.toBeInstanceOf(
      UnsupportedExpandTypeError,
    );
  });

  it('expands an ASSUNTO into topics and concepts with PERTENCE_A edges', async () => {
    const llm = new FakeLlm('{"topicos":[{"nome":"T1","conceitos":[{"nome":"C1"}]}]}');
    const { useCase, nodeWriter, edgeWriter } = build(
      { tipo: 'ASSUNTO', nome: 'A', desc: '' },
      llm,
    );
    const counts = await useCase.execute('u1', 'g1', 'target');
    expect(counts).toEqual({ topicos: 1, conceitos: 1, notas: 0, flashcards: 0 });
    expect(nodeWriter.created.map((n) => n.tipoNode)).toEqual(['TOPICO', 'CONCEITO']);
    expect(edgeWriter.created).toEqual([
      { sourceNodeId: 'n1', targetNodeId: 'target', tipoRelacao: 'PERTENCE_A' },
      { sourceNodeId: 'n2', targetNodeId: 'n1', tipoRelacao: 'PERTENCE_A' },
    ]);
  });

  it('reuses an existing node from the name index instead of creating it', async () => {
    const names = new FakeNames(new Map([['TOPICO|t1', 'existing']]));
    const llm = new FakeLlm('{"topicos":[{"nome":"T1","conceitos":[]}]}');
    const { useCase, nodeWriter, edgeWriter } = build(
      { tipo: 'ASSUNTO', nome: 'A', desc: '' },
      llm,
      names,
    );
    const counts = await useCase.execute('u1', 'g1', 'target');
    expect(counts.topicos).toBe(0);
    expect(nodeWriter.created).toHaveLength(0);
    expect(edgeWriter.created[0]).toEqual({
      sourceNodeId: 'existing',
      targetNodeId: 'target',
      tipoRelacao: 'PERTENCE_A',
    });
  });

  it('expands a NOTA into flashcards linked with TESTA', async () => {
    const llm = new FakeLlm('{"flashcards":[{"pergunta":"p","resposta":"r"},{"pergunta":"  "}]}');
    const { useCase, nodeWriter, edgeWriter } = build({ tipo: 'NOTA', nome: 'N', desc: '' }, llm);
    const counts = await useCase.execute('u1', 'g1', 'target');
    expect(counts.flashcards).toBe(1);
    expect(nodeWriter.created[0]).toEqual({ tipoNode: 'FLASHCARD', pergunta: 'p', resposta: 'r' });
    expect(edgeWriter.created[0]?.tipoRelacao).toBe('TESTA');
  });

  it('adds nothing when the model output is invalid JSON', async () => {
    const { useCase, nodeWriter } = build(
      { tipo: 'ASSUNTO', nome: 'A', desc: '' },
      new FakeLlm('x'),
    );
    expect(await useCase.execute('u1', 'g1', 'target')).toEqual({
      topicos: 0,
      conceitos: 0,
      notas: 0,
      flashcards: 0,
    });
    expect(nodeWriter.created).toHaveLength(0);
  });
});
