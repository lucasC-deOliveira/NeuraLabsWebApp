import { describe, it, expect, beforeEach } from 'vitest';
import { CreateDeckUseCase } from './create-deck.use-case';
import {
  DeckTitleRequiredError,
  FlashcardsNotOwnedError,
  GraphNotFoundError,
} from '../../domain/errors';
import type { CreateDeckRepository } from '../../domain/ports/create-deck-repository';

class FakeCreateDeckRepository implements CreateDeckRepository {
  graphs = new Set<string>();
  ownedFlashcards = true;
  created: { titulo: string; flashcardIds: string[] } | null = null;
  async graphExists(grafoId: string): Promise<boolean> {
    return this.graphs.has(grafoId);
  }
  async allFlashcardsOwned(): Promise<boolean> {
    return this.ownedFlashcards;
  }
  async createDeck(
    _u: string,
    _g: string,
    titulo: string,
    flashcardIds: string[],
  ): Promise<string> {
    this.created = { titulo, flashcardIds };
    return 'deck-1';
  }
}

describe('CreateDeckUseCase', () => {
  let repo: FakeCreateDeckRepository;
  let useCase: CreateDeckUseCase;

  beforeEach(() => {
    repo = new FakeCreateDeckRepository();
    repo.graphs.add('g1');
    useCase = new CreateDeckUseCase(repo);
  });

  it('creates the deck from owned flashcards', async () => {
    const res = await useCase.execute('u1', 'g1', '  Bio  ', ['f1', 'f1', 'f2']);
    expect(res).toEqual({ success: true, nodeId: 'deck-1' });
    expect(repo.created).toEqual({ titulo: 'Bio', flashcardIds: ['f1', 'f2'] });
  });

  it('throws when the graph does not exist', async () => {
    await expect(useCase.execute('u1', 'missing', 'Bio', [])).rejects.toBeInstanceOf(
      GraphNotFoundError,
    );
  });

  it('throws when the title is blank', async () => {
    await expect(useCase.execute('u1', 'g1', '  ', [])).rejects.toBeInstanceOf(
      DeckTitleRequiredError,
    );
  });

  it('throws when some flashcards are not owned', async () => {
    repo.ownedFlashcards = false;
    await expect(useCase.execute('u1', 'g1', 'Bio', ['f1'])).rejects.toBeInstanceOf(
      FlashcardsNotOwnedError,
    );
    expect(repo.created).toBeNull();
  });

  it('skips the ownership check when there are no flashcards', async () => {
    repo.ownedFlashcards = false;
    const res = await useCase.execute('u1', 'g1', 'Empty', []);
    expect(res.nodeId).toBe('deck-1');
  });
});
