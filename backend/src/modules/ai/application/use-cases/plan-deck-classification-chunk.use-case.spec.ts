import { describe, it, expect } from 'vitest';
import { PlanDeckClassificationChunkUseCase } from './plan-deck-classification-chunk.use-case';
import { BaralhoNotFoundError, EmptyBaralhoError, GraphNotFoundError } from '../../domain/errors';
import type {
  DeckCard,
  DeckClassificationRepository,
  DeckForClassification,
} from '../../domain/ports/deck-classification-repository';
import type { GraphNameIndexRepository } from '../../domain/ports/graph-name-index-repository';
import type { LlmPort, LlmRequest } from '../../domain/ports/llm-port';

class FakeDeckClassificationRepository implements DeckClassificationRepository {
  constructor(
    private readonly deck: DeckForClassification | null,
    private readonly classified = new Set<string>(),
    private readonly graphOk = true,
  ) {}
  async graphExists(): Promise<boolean> {
    return this.graphOk;
  }
  async loadDeck(): Promise<DeckForClassification | null> {
    return this.deck;
  }
  async loadClassifiedCardIds(): Promise<Set<string>> {
    return this.classified;
  }
}

class FakeNames implements GraphNameIndexRepository {
  async loadNameIndex(): Promise<{ nameIndex: Map<string, string>; existingContext: string }> {
    return { nameIndex: new Map(), existingContext: '' };
  }
}

class FakeLlm implements LlmPort {
  readonly requests: LlmRequest[] = [];
  constructor(private readonly response: string) {}
  async complete(request: LlmRequest): Promise<string> {
    this.requests.push(request);
    return this.response;
  }
}

const card = (id: string): DeckCard => ({ id, pergunta: `P ${id}`, resposta: `R ${id}` });

const PLAN_JSON =
  '{"assuntos":[{"nome":"Algoritmos","descricao":""}],' +
  '"topicos":[{"nome":"Grafos","assunto":"Algoritmos","descricao":""}],' +
  '"conceitos":[{"nome":"Dijkstra","topico":"Grafos","descricao":"","indices":[0,1]}]}';

function build(deck: DeckForClassification | null, classified?: Set<string>, graphOk = true) {
  const llm = new FakeLlm(PLAN_JSON);
  const repo = new FakeDeckClassificationRepository(deck, classified, graphOk);
  const useCase = new PlanDeckClassificationChunkUseCase(repo, new FakeNames(), llm);
  return { useCase, llm };
}

describe('PlanDeckClassificationChunkUseCase', () => {
  it('plans only the unclassified cards and maps indices to their ids', async () => {
    const deck = { titulo: 'Deck', cards: [card('fc1'), card('fc2'), card('fc3')] };
    const { useCase, llm } = build(deck, new Set(['fc1']));

    const result = await useCase.execute('u1', 'g1', 'd1');

    expect(result.totalCards).toBe(3);
    expect(result.classifiedCards).toBe(1);
    expect(result.chunkCards.map((c) => c.id)).toEqual(['fc2', 'fc3']);
    expect(result.plan?.conceitos[0].flashcardIds).toEqual(['fc2', 'fc3']);
    expect(llm.requests).toHaveLength(1);
  });

  it('limits the chunk to chunkSize pending cards', async () => {
    const deck = { titulo: 'Deck', cards: [card('fc1'), card('fc2'), card('fc3')] };
    const { useCase, llm } = build(deck);

    const result = await useCase.execute('u1', 'g1', 'd1', 2);

    expect(result.chunkCards.map((c) => c.id)).toEqual(['fc1', 'fc2']);
    expect(llm.requests[0].messages[1].content).not.toContain('P fc3');
  });

  it('finishes without calling the model when every card is classified', async () => {
    const deck = { titulo: 'Deck', cards: [card('fc1')] };
    const { useCase, llm } = build(deck, new Set(['fc1']));

    const result = await useCase.execute('u1', 'g1', 'd1');

    expect(result.plan).toBeNull();
    expect(result.chunkCards).toEqual([]);
    expect(llm.requests).toHaveLength(0);
  });

  it('throws when the graph does not exist', async () => {
    const { useCase } = build({ titulo: 'Deck', cards: [card('fc1')] }, undefined, false);
    await expect(useCase.execute('u1', 'gx', 'd1')).rejects.toBeInstanceOf(GraphNotFoundError);
  });

  it('throws when the deck does not exist', async () => {
    const { useCase } = build(null);
    await expect(useCase.execute('u1', 'g1', 'dx')).rejects.toBeInstanceOf(BaralhoNotFoundError);
  });

  it('throws when the deck has no cards', async () => {
    const { useCase } = build({ titulo: 'Deck', cards: [] });
    await expect(useCase.execute('u1', 'g1', 'd1')).rejects.toBeInstanceOf(EmptyBaralhoError);
  });
});
