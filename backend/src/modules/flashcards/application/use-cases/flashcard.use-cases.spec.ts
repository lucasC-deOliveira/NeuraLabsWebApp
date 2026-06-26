import { describe, it, expect } from 'vitest';
import { PreviewFlashcardsFromNotaUseCase } from './preview-flashcards-from-nota.use-case';
import { SaveFlashcardPreviewsUseCase } from './save-flashcard-previews.use-case';
import { CreateFlashcardUseCase } from './create-flashcard.use-case';
import { DeleteAllFlashcardsUseCase } from './delete-all-flashcards.use-case';
import { NotaNotFoundError } from '../../domain/errors';
import type { ConceitoRef, FlashcardRepository } from '../../domain/ports/flashcard-repository';
import type { CreateFlashcardInput, PreviewCard } from '../../domain/flashcard-views';

class FakeRepo implements FlashcardRepository {
  savedMany: PreviewCard[] = [];
  constructor(
    private readonly nota: { conteudo: string } | null = null,
    private readonly concepts: ConceitoRef[] = [],
  ) {}
  async create(): Promise<string> {
    return 'fc-1';
  }
  async update(): Promise<void> {}
  async delete(): Promise<void> {}
  async deleteAllWithGraph(): Promise<number> {
    return 4;
  }
  async saveMany(_userId: string, cards: PreviewCard[]): Promise<number> {
    this.savedMany = cards;
    return cards.length;
  }
  async loadNotaContent(): Promise<{ conteudo: string } | null> {
    return this.nota;
  }
  async loadConcepts(): Promise<ConceitoRef[]> {
    return this.concepts;
  }
}

const input: CreateFlashcardInput = { pergunta: 'p', resposta: 'r' };

describe('flashcards use-cases', () => {
  it('creates a flashcard', async () => {
    expect(await new CreateFlashcardUseCase(new FakeRepo()).execute('u1', input)).toEqual({
      flashcardId: 'fc-1',
    });
  });

  it('deletes all flashcards and returns the count', async () => {
    expect(await new DeleteAllFlashcardsUseCase(new FakeRepo()).execute('u1')).toEqual({
      count: 4,
    });
  });

  it('saves selected previews and returns the count', async () => {
    const repo = new FakeRepo();
    const cards: PreviewCard[] = [{ pergunta: 'p', resposta: 'r', conceitoId: 'c1' }];
    expect(await new SaveFlashcardPreviewsUseCase(repo).execute('u1', cards)).toEqual({ count: 1 });
    expect(repo.savedMany).toEqual(cards);
  });

  it('throws when previewing from a missing note', async () => {
    const useCase = new PreviewFlashcardsFromNotaUseCase(new FakeRepo(null));
    await expect(useCase.execute('u1', 'n1')).rejects.toBeInstanceOf(NotaNotFoundError);
  });

  it('previews rule-based flashcards from the note content', async () => {
    const repo = new FakeRepo({ conteudo: '# Bio\n\nMitose: divisão celular em duas células.' }, [
      { id: 'c1', nome: 'Mitose' },
    ]);
    const preview = await new PreviewFlashcardsFromNotaUseCase(repo).execute('u1', 'n1');
    expect(preview.length).toBeGreaterThan(0);
  });
});
