import { describe, it, expect } from 'vitest';
import { ClassifyFlashcardUseCase } from './classify-flashcard.use-case';
import { AiNodeNotFoundError, UnsupportedExpandTypeError } from '../../domain/errors';
import { nodeNameKey } from '../../domain/services/node-name-key';
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
    return { nodeId: `new-${this.created.length}` };
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

const FLASHCARD: ExpandTarget = {
  tipo: 'FLASHCARD',
  nome: 'O que é recursão?',
  desc: 'Função que se chama.',
};

function build(target: ExpandTarget | null, response: string, index = new Map<string, string>()) {
  const nodeWriter = new FakeNodeWriter();
  const edgeWriter = new FakeEdgeWriter();
  const useCase = new ClassifyFlashcardUseCase(
    new FakeTargets(target),
    new FakeNames(index),
    nodeWriter,
    edgeWriter,
    new FakeLlm(response),
  );
  return { useCase, nodeWriter, edgeWriter };
}

describe('ClassifyFlashcardUseCase', () => {
  it('links the flashcard to an existing concept without creating a node', async () => {
    const index = new Map([[nodeNameKey('CONCEITO', 'Recursão'), 'c-existing']]);
    const { useCase, nodeWriter, edgeWriter } = build(
      FLASHCARD,
      '{"conceitos":[{"nome":"Recursão"}]}',
      index,
    );

    const result = await useCase.execute('u1', 'g1', 'fc1');

    expect(nodeWriter.created).toHaveLength(0);
    expect(result).toEqual({ conceitos: 0, linked: 1 });
    expect(edgeWriter.created).toEqual([
      { sourceNodeId: 'fc1', targetNodeId: 'c-existing', tipoRelacao: 'DEFINE' },
    ]);
  });

  it('creates a new concept when it is unknown, then links to it', async () => {
    const { useCase, nodeWriter, edgeWriter } = build(
      FLASHCARD,
      '{"conceitos":[{"nome":"Pilha de chamadas","descricao":"call stack"}]}',
    );

    const result = await useCase.execute('u1', 'g1', 'fc1');

    expect(nodeWriter.created).toEqual([
      { tipoNode: 'CONCEITO', nome: 'Pilha de chamadas', descricao: 'call stack' },
    ]);
    expect(result).toEqual({ conceitos: 1, linked: 1 });
    expect(edgeWriter.created[0]).toMatchObject({ sourceNodeId: 'fc1', tipoRelacao: 'DEFINE' });
  });

  it('reuses an existing concept ignoring case and accents', async () => {
    const index = new Map([[nodeNameKey('CONCEITO', 'Recursão'), 'c-existing']]);
    const { useCase, nodeWriter } = build(FLASHCARD, '{"conceitos":[{"nome":"recursao"}]}', index);

    await useCase.execute('u1', 'g1', 'fc1');

    expect(nodeWriter.created).toHaveLength(0);
  });

  it('caps at four concepts', async () => {
    const many = Array.from({ length: 9 }, (_v, i) => `{"nome":"C${i}"}`).join(',');
    const { useCase, edgeWriter } = build(FLASHCARD, `{"conceitos":[${many}]}`);

    await useCase.execute('u1', 'g1', 'fc1');

    expect(edgeWriter.created).toHaveLength(4);
  });

  it('links nothing when the AI output is invalid JSON', async () => {
    const { useCase, nodeWriter, edgeWriter } = build(FLASHCARD, 'not json');

    const result = await useCase.execute('u1', 'g1', 'fc1');

    expect(result).toEqual({ conceitos: 0, linked: 0 });
    expect(nodeWriter.created).toHaveLength(0);
    expect(edgeWriter.created).toHaveLength(0);
  });

  it('throws when the node is not found', async () => {
    const { useCase } = build(null, '{}');
    await expect(useCase.execute('u1', 'g1', 'x')).rejects.toBeInstanceOf(AiNodeNotFoundError);
  });

  it('throws when the target is not a flashcard', async () => {
    const conceito: ExpandTarget = { tipo: 'CONCEITO', nome: 'X', desc: '' };
    const { useCase } = build(conceito, '{}');
    await expect(useCase.execute('u1', 'g1', 'x')).rejects.toBeInstanceOf(
      UnsupportedExpandTypeError,
    );
  });
});
