import { describe, it, expect } from 'vitest';
import { CreateNotaUseCase } from './create-nota.use-case';
import { DeleteAllNotasUseCase } from './delete-all-notas.use-case';
import { GenerateFlashcardsFromNotaUseCase } from './generate-flashcards-from-nota.use-case';
import { NotaNotFoundError } from '../../domain/errors';
import type { ConceitoRef, NewFlashcard, NotaRepository } from '../../domain/ports/nota-repository';
import type { CreateNotaInput, FlashcardCreated } from '../../domain/note-views';

class FakeRepo implements NotaRepository {
  createdCards: NewFlashcard[] = [];
  constructor(
    private readonly nota: { conteudo: string } | null = null,
    private readonly concepts: ConceitoRef[] = [],
  ) {}
  async createNota(): Promise<string> {
    return 'nota-1';
  }
  async deleteNota(): Promise<void> {}
  async deleteAll(): Promise<number> {
    return 3;
  }
  async loadNotaContent(): Promise<{ conteudo: string } | null> {
    return this.nota;
  }
  async loadConcepts(): Promise<ConceitoRef[]> {
    return this.concepts;
  }
  async createFlashcards(_userId: string, cards: NewFlashcard[]): Promise<FlashcardCreated[]> {
    this.createdCards = cards;
    return cards.map((c, i) => ({ id: `fc${i}`, pergunta: c.pergunta }));
  }
}

const input: CreateNotaInput = { titulo: 'T', conteudo: 'c' };

describe('notes use-cases', () => {
  it('creates a note and returns its id', async () => {
    expect(await new CreateNotaUseCase(new FakeRepo()).execute('u1', input)).toEqual({
      notaId: 'nota-1',
    });
  });

  it('deletes all notes and returns the count', async () => {
    expect(await new DeleteAllNotasUseCase(new FakeRepo()).execute('u1')).toEqual({ count: 3 });
  });

  it('throws when the note for flashcards is missing', async () => {
    const useCase = new GenerateFlashcardsFromNotaUseCase(new FakeRepo(null));
    await expect(useCase.execute('u1', 'n1')).rejects.toBeInstanceOf(NotaNotFoundError);
  });

  it('builds rule-based flashcards from the note content', async () => {
    const repo = new FakeRepo(
      { conteudo: '# Biologia\n\nMitose: divisão celular que produz duas células.' },
      [{ id: 'c1', nome: 'Mitose' }],
    );
    const res = await new GenerateFlashcardsFromNotaUseCase(repo).execute('u1', 'n1');
    expect(res.flashcards.length).toBeGreaterThan(0);
    expect(repo.createdCards.every((c) => c.conceitoId === 'c1')).toBe(true);
  });
});
