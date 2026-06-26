import type { FlashcardRepository } from '../../domain/ports/flashcard-repository';
import type { CreateFlashcardInput } from '../../domain/flashcard-views';

/**
 * Creates a single flashcard.
 * @example createFlashcard.execute('u1', { pergunta, resposta })
 */
export class CreateFlashcardUseCase {
  constructor(private readonly repo: FlashcardRepository) {}

  async execute(userId: string, input: CreateFlashcardInput): Promise<{ flashcardId: string }> {
    return { flashcardId: await this.repo.create(userId, input) };
  }
}
