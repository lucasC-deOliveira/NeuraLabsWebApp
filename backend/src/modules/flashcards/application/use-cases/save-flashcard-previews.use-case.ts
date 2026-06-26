import type { FlashcardRepository } from '../../domain/ports/flashcard-repository';
import type { PreviewCard } from '../../domain/flashcard-views';

/**
 * Saves selected flashcard previews as real flashcards (with SRS).
 * @example saveFlashcardPreviews.execute('u1', [{ pergunta, resposta, conceitoId }])
 */
export class SaveFlashcardPreviewsUseCase {
  constructor(private readonly repo: FlashcardRepository) {}

  async execute(userId: string, cards: PreviewCard[]): Promise<{ count: number }> {
    return { count: await this.repo.saveMany(userId, cards) };
  }
}
