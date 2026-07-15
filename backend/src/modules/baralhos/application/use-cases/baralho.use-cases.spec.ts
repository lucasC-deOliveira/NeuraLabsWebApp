import { describe, it, expect } from 'vitest';
import {
  AddCardsToBaralhoUseCase,
  CreateBaralhoUseCase,
  DeleteBaralhoUseCase,
  GetBaralhoUseCase,
  ImportBaralhosUseCase,
  ListBaralhosUseCase,
  RemoveCardFromBaralhoUseCase,
  RenameBaralhoUseCase,
} from './baralho.use-cases';
import type { BaralhoQuery } from '../../domain/ports/baralho-query';
import type { BaralhoRepository } from '../../domain/ports/baralho-repository';
import type {
  BaralhoDetail,
  BaralhoListItem,
  CreateBaralhoInput,
  ImportedBaralho,
} from '../../domain/baralho-views';
import {
  BaralhoNotFoundError,
  EmptyImportError,
  InvalidBaralhoTitleError,
} from '../../domain/errors';

const DATE = new Date('2026-01-10T12:00:00Z');

class FakeBaralhoQuery implements BaralhoQuery {
  constructor(
    private readonly items: BaralhoListItem[] = [],
    private readonly detail: BaralhoDetail | null = null,
  ) {}
  listBaralhos(): Promise<BaralhoListItem[]> {
    return Promise.resolve(this.items);
  }
  getBaralho(): Promise<BaralhoDetail | null> {
    return Promise.resolve(this.detail);
  }
}

// Guarda as chamadas para os testes verificarem o que chegou no port,
// e `found` simula o baralho existir (ou não) para o usuário.
class FakeBaralhoRepository implements BaralhoRepository {
  createdWith: CreateBaralhoInput | null = null;
  renamedTo: string | null = null;
  removedId: string | null = null;
  addedCards: string[] | null = null;
  removedCard: string | null = null;
  importedWith: ImportedBaralho[] | null = null;

  constructor(private readonly found = true) {}

  create(_userId: string, input: CreateBaralhoInput): Promise<{ baralhoId: string }> {
    this.createdWith = input;
    return Promise.resolve({ baralhoId: 'b-new' });
  }
  rename(_userId: string, _baralhoId: string, titulo: string): Promise<boolean> {
    this.renamedTo = titulo;
    return Promise.resolve(this.found);
  }
  remove(_userId: string, baralhoId: string): Promise<boolean> {
    this.removedId = baralhoId;
    return Promise.resolve(this.found);
  }
  addCards(_userId: string, _baralhoId: string, flashcardIds: string[]): Promise<boolean> {
    this.addedCards = flashcardIds;
    return Promise.resolve(this.found);
  }
  removeCard(_userId: string, _baralhoId: string, flashcardId: string): Promise<boolean> {
    this.removedCard = flashcardId;
    return Promise.resolve(this.found);
  }
  importBaralhos(_userId: string, baralhos: ImportedBaralho[]): Promise<{ count: number }> {
    this.importedWith = baralhos;
    return Promise.resolve({ count: baralhos.length });
  }
}

const listItem: BaralhoListItem = {
  id: 'b1',
  titulo: 'Bio',
  totalCards: 2,
  novos: 1,
  aprender: 0,
  revisar: 1,
  dataCriacao: DATE,
  origens: [],
};

const detail: BaralhoDetail = {
  id: 'b1',
  titulo: 'Bio',
  dataCriacao: DATE,
  origens: [],
  cards: [],
};

describe('ListBaralhosUseCase', () => {
  it('returns the decks of the user', async () => {
    const useCase = new ListBaralhosUseCase(new FakeBaralhoQuery([listItem]));
    expect(await useCase.execute('u1')).toEqual([listItem]);
  });
});

describe('GetBaralhoUseCase', () => {
  it('returns the deck detail', async () => {
    const useCase = new GetBaralhoUseCase(new FakeBaralhoQuery([], detail));
    expect(await useCase.execute('u1', 'b1')).toEqual(detail);
  });

  it('rejects a deck that does not belong to the user', async () => {
    const useCase = new GetBaralhoUseCase(new FakeBaralhoQuery([], null));
    await expect(useCase.execute('u1', 'ghost')).rejects.toThrow(BaralhoNotFoundError);
  });
});

describe('CreateBaralhoUseCase', () => {
  it('creates the deck with a trimmed title', async () => {
    const repo = new FakeBaralhoRepository();
    const result = await new CreateBaralhoUseCase(repo).execute('u1', '  Bio  ', ['fc1']);
    expect(result).toEqual({ baralhoId: 'b-new' });
    expect(repo.createdWith).toEqual({ titulo: 'Bio', flashcardIds: ['fc1'] });
  });

  it('rejects a blank title before touching the repository', async () => {
    const repo = new FakeBaralhoRepository();
    await expect(new CreateBaralhoUseCase(repo).execute('u1', '   ', [])).rejects.toThrow(
      InvalidBaralhoTitleError,
    );
    expect(repo.createdWith).toBeNull();
  });
});

describe('RenameBaralhoUseCase', () => {
  it('renames with the normalized title', async () => {
    const repo = new FakeBaralhoRepository();
    await new RenameBaralhoUseCase(repo).execute('u1', 'b1', '  Novo  ');
    expect(repo.renamedTo).toBe('Novo');
  });

  it('rejects renaming a deck of another user', async () => {
    const repo = new FakeBaralhoRepository(false);
    await expect(new RenameBaralhoUseCase(repo).execute('u1', 'b1', 'Novo')).rejects.toThrow(
      BaralhoNotFoundError,
    );
  });
});

describe('DeleteBaralhoUseCase', () => {
  it('deletes the deck', async () => {
    const repo = new FakeBaralhoRepository();
    await new DeleteBaralhoUseCase(repo).execute('u1', 'b1');
    expect(repo.removedId).toBe('b1');
  });

  it('rejects deleting a deck of another user', async () => {
    const repo = new FakeBaralhoRepository(false);
    await expect(new DeleteBaralhoUseCase(repo).execute('u1', 'b1')).rejects.toThrow(
      BaralhoNotFoundError,
    );
  });
});

describe('AddCardsToBaralhoUseCase', () => {
  it('adds the cards', async () => {
    const repo = new FakeBaralhoRepository();
    await new AddCardsToBaralhoUseCase(repo).execute('u1', 'b1', ['fc1', 'fc2']);
    expect(repo.addedCards).toEqual(['fc1', 'fc2']);
  });

  it('rejects adding to a deck of another user', async () => {
    const repo = new FakeBaralhoRepository(false);
    await expect(new AddCardsToBaralhoUseCase(repo).execute('u1', 'b1', ['fc1'])).rejects.toThrow(
      BaralhoNotFoundError,
    );
  });
});

describe('RemoveCardFromBaralhoUseCase', () => {
  it('removes the card from the deck', async () => {
    const repo = new FakeBaralhoRepository();
    await new RemoveCardFromBaralhoUseCase(repo).execute('u1', 'b1', 'fc1');
    expect(repo.removedCard).toBe('fc1');
  });

  it('rejects removing from a deck of another user', async () => {
    const repo = new FakeBaralhoRepository(false);
    await expect(new RemoveCardFromBaralhoUseCase(repo).execute('u1', 'b1', 'fc1')).rejects.toThrow(
      BaralhoNotFoundError,
    );
  });
});

describe('ImportBaralhosUseCase', () => {
  it('imports the parsed decks', async () => {
    const repo = new FakeBaralhoRepository();
    const payload = [{ titulo: 'Bio', cards: [{ pergunta: 'p', resposta: 'r' }] }];
    expect(await new ImportBaralhosUseCase(repo).execute('u1', payload)).toEqual({ count: 1 });
    expect(repo.importedWith).toEqual(payload);
  });

  it('rejects a payload with nothing importable', async () => {
    const repo = new FakeBaralhoRepository();
    await expect(new ImportBaralhosUseCase(repo).execute('u1', [])).rejects.toThrow(
      EmptyImportError,
    );
    expect(repo.importedWith).toBeNull();
  });
});
