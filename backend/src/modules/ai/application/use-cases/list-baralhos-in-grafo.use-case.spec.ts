import { describe, it, expect } from 'vitest';
import { ListBaralhosInGrafoUseCase } from './list-baralhos-in-grafo.use-case';
import type { GraphDeck, GraphDecksQuery } from '../../domain/ports/graph-decks-query';

class FakeDecks implements GraphDecksQuery {
  calls: Array<{ userId: string; grafoId: string }> = [];
  constructor(private readonly decks: GraphDeck[]) {}
  async listDecks(userId: string, grafoId: string): Promise<GraphDeck[]> {
    this.calls.push({ userId, grafoId });
    return this.decks;
  }
}

describe('ListBaralhosInGrafoUseCase', () => {
  it('delegates to the decks query and returns its result', async () => {
    const decks: GraphDeck[] = [{ id: 'b1', titulo: 'Bio', flashcardCount: 3 }];
    const query = new FakeDecks(decks);
    const useCase = new ListBaralhosInGrafoUseCase(query);
    expect(await useCase.execute('u1', 'g1')).toBe(decks);
    expect(query.calls).toEqual([{ userId: 'u1', grafoId: 'g1' }]);
  });
});
