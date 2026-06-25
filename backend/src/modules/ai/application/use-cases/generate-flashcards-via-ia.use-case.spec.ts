import { describe, it, expect } from 'vitest';
import { GenerateFlashcardsViaIaUseCase } from './generate-flashcards-via-ia.use-case';
import { NoteNotFoundError } from '../../domain/errors';
import type {
  ConceptRef,
  FlashcardSourceRepository,
} from '../../domain/ports/flashcard-source-repository';
import type { LlmPort, LlmRequest } from '../../domain/ports/llm-port';

class FakeRepo implements FlashcardSourceRepository {
  constructor(
    private readonly note: { conteudo: string } | null,
    private readonly concepts: ConceptRef[] = [],
  ) {}
  async loadNote(): Promise<{ conteudo: string } | null> {
    return this.note;
  }
  async loadConcepts(): Promise<ConceptRef[]> {
    return this.concepts;
  }
}

class FakeLlm implements LlmPort {
  lastRequest: LlmRequest | null = null;
  constructor(private readonly response: string) {}
  async complete(request: LlmRequest): Promise<string> {
    this.lastRequest = request;
    return this.response;
  }
}

const concepts: ConceptRef[] = [{ id: 'c1', nome: 'Mitose' }];

describe('GenerateFlashcardsViaIaUseCase', () => {
  it('throws when the note is not found', async () => {
    const useCase = new GenerateFlashcardsViaIaUseCase(new FakeRepo(null), new FakeLlm('{}'));
    await expect(useCase.execute('u1', 'nota1')).rejects.toBeInstanceOf(NoteNotFoundError);
  });

  it('maps valid cards and resolves the concept', async () => {
    const llm = new FakeLlm(
      '{"flashcards":[{"pergunta":"P","resposta":"R","tipo":"cloze","conceito":"Mitose"},{"pergunta":"","resposta":"x"}]}',
    );
    const useCase = new GenerateFlashcardsViaIaUseCase(
      new FakeRepo({ conteudo: 't' }, concepts),
      llm,
    );
    const cards = await useCase.execute('u1', 'nota1');
    expect(cards).toHaveLength(1);
    expect(cards[0]).toMatchObject({
      pergunta: 'P',
      resposta: 'R',
      conceitoId: 'c1',
      conceptNome: 'Mitose',
      source: 'cloze',
    });
    expect(typeof cards[0]?.id).toBe('string');
    expect(llm.lastRequest?.temperature).toBe(0.5);
  });

  it('omits conceptNome when the model marks the concept as desconhecido', async () => {
    const llm = new FakeLlm(
      '{"flashcards":[{"pergunta":"P","resposta":"R","conceito":"desconhecido"}]}',
    );
    const useCase = new GenerateFlashcardsViaIaUseCase(
      new FakeRepo({ conteudo: 't' }, concepts),
      llm,
    );
    const cards = await useCase.execute('u1', 'nota1');
    expect(cards[0]?.conceptNome).toBeUndefined();
    expect(cards[0]?.source).toBe('pergunta_resposta');
  });
});
