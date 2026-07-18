import { describe, it, expect } from 'vitest';
import { ApplyDeckClassificationChunkUseCase } from './apply-deck-classification-chunk.use-case';
import { BaralhoNotFoundError, GraphNotFoundError } from '../../domain/errors';
import { nodeNameKey } from '../../domain/services/node-name-key';
import type { ClassificationPlan } from '../../domain/services/classification-plan';
import type {
  DeckClassificationRepository,
  DeckForClassification,
} from '../../domain/ports/deck-classification-repository';
import type { GraphNameIndexRepository } from '../../domain/ports/graph-name-index-repository';
import type { GraphNodeInput, GraphNodeWriter } from '../../domain/ports/graph-node-writer';
import type { GraphNodeAttacher } from '../../domain/ports/graph-node-attacher';
import type { GraphEdgeInput, GraphEdgeWriter } from '../../domain/ports/graph-edge-writer';

class FakeDeckClassificationRepository implements DeckClassificationRepository {
  constructor(
    private readonly deck: DeckForClassification | null,
    private readonly graphOk = true,
  ) {}
  async graphExists(): Promise<boolean> {
    return this.graphOk;
  }
  async loadDeck(): Promise<DeckForClassification | null> {
    return this.deck;
  }
  async loadClassifiedCardIds(): Promise<Set<string>> {
    return new Set();
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

class FakeNodeAttacher implements GraphNodeAttacher {
  readonly attached: { tipoNode: string; entityId: string }[] = [];
  async attachExisting(_u: string, _g: string, tipoNode: string, entityId: string): Promise<void> {
    this.attached.push({ tipoNode, entityId });
  }
}

class FakeEdgeWriter implements GraphEdgeWriter {
  readonly created: GraphEdgeInput[] = [];
  async createEdge(_u: string, _g: string, edge: GraphEdgeInput): Promise<void> {
    this.created.push(edge);
  }
}

const DECK: DeckForClassification = {
  titulo: 'Deck',
  cards: [
    { id: 'fc1', pergunta: 'P1', resposta: 'R1' },
    { id: 'fc2', pergunta: 'P2', resposta: 'R2' },
  ],
};

const PLAN: ClassificationPlan = {
  assuntos: [{ nome: 'Algoritmos', descricao: '' }],
  topicos: [{ nome: 'Grafos', assunto: 'Algoritmos', descricao: '' }],
  conceitos: [{ nome: 'Dijkstra', topico: 'Grafos', descricao: '', flashcardIds: ['fc1', 'fc2'] }],
};

function build(
  deck: DeckForClassification | null = DECK,
  index?: Map<string, string>,
  graphOk = true,
) {
  const nodeWriter = new FakeNodeWriter();
  const attacher = new FakeNodeAttacher();
  const edgeWriter = new FakeEdgeWriter();
  const useCase = new ApplyDeckClassificationChunkUseCase(
    new FakeDeckClassificationRepository(deck, graphOk),
    new FakeNames(index),
    nodeWriter,
    attacher,
    edgeWriter,
  );
  return { useCase, nodeWriter, attacher, edgeWriter };
}

describe('ApplyDeckClassificationChunkUseCase', () => {
  it('creates the hierarchy, attaches card nodes and wires DEFINE edges', async () => {
    const { useCase, nodeWriter, attacher, edgeWriter } = build();

    const result = await useCase.execute('u1', 'g1', 'd1', PLAN);

    expect(result).toEqual({ assuntos: 1, topicos: 1, conceitos: 1, linkedCards: 2 });
    expect(nodeWriter.created.map((n) => n.tipoNode)).toEqual(['ASSUNTO', 'TOPICO', 'CONCEITO']);
    expect(attacher.attached).toEqual([
      { tipoNode: 'FLASHCARD', entityId: 'fc1' },
      { tipoNode: 'FLASHCARD', entityId: 'fc2' },
    ]);
    expect(edgeWriter.created).toContainEqual({
      sourceNodeId: 'fc1',
      targetNodeId: 'new-3',
      tipoRelacao: 'DEFINE',
    });
  });

  it('reuses an existing concept ignoring case and accents', async () => {
    const index = new Map([[nodeNameKey('CONCEITO', 'Dijkstra'), 'c-existing']]);
    const { useCase, nodeWriter, edgeWriter } = build(DECK, index);

    const result = await useCase.execute('u1', 'g1', 'd1', {
      assuntos: [],
      topicos: [],
      conceitos: [{ nome: 'dijkstra', topico: '', descricao: '', flashcardIds: ['fc1'] }],
    });

    expect(result.conceitos).toBe(0);
    expect(nodeWriter.created).toHaveLength(0);
    expect(edgeWriter.created).toContainEqual({
      sourceNodeId: 'fc1',
      targetNodeId: 'c-existing',
      tipoRelacao: 'DEFINE',
    });
  });

  it('ignores card ids that do not belong to the deck', async () => {
    const { useCase, attacher, edgeWriter } = build();

    const result = await useCase.execute('u1', 'g1', 'd1', {
      assuntos: [],
      topicos: [],
      conceitos: [{ nome: 'X', topico: '', descricao: '', flashcardIds: ['intruso'] }],
    });

    expect(result.linkedCards).toBe(0);
    expect(attacher.attached).toHaveLength(0);
    expect(edgeWriter.created).toHaveLength(0);
  });

  it('counts a card linked to two concepts once', async () => {
    const { useCase } = build();

    const result = await useCase.execute('u1', 'g1', 'd1', {
      assuntos: [],
      topicos: [],
      conceitos: [
        { nome: 'A', topico: '', descricao: '', flashcardIds: ['fc1'] },
        { nome: 'B', topico: '', descricao: '', flashcardIds: ['fc1'] },
      ],
    });

    expect(result.linkedCards).toBe(1);
  });

  it('throws when the graph does not exist', async () => {
    const { useCase } = build(DECK, undefined, false);
    await expect(useCase.execute('u1', 'gx', 'd1', PLAN)).rejects.toBeInstanceOf(
      GraphNotFoundError,
    );
  });

  it('throws when the deck does not exist', async () => {
    const { useCase } = build(null);
    await expect(useCase.execute('u1', 'g1', 'dx', PLAN)).rejects.toBeInstanceOf(
      BaralhoNotFoundError,
    );
  });
});
