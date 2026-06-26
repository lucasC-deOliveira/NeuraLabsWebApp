import { NotaNotFoundError } from '../../domain/errors';
import type { FlashcardRepository } from '../../domain/ports/flashcard-repository';
import { buildRulePreview, type FlashcardPreview } from '../../../../content/flashcard-gen';

/**
 * Previews rule-based flashcards for a note (no persistence).
 * @example previewFlashcards.execute('u1', 'n1')
 */
export class PreviewFlashcardsFromNotaUseCase {
  constructor(private readonly repo: FlashcardRepository) {}

  async execute(userId: string, notaId: string): Promise<FlashcardPreview[]> {
    const nota = await this.repo.loadNotaContent(userId, notaId);
    if (!nota) throw new NotaNotFoundError();
    const concepts = await this.repo.loadConcepts(userId);
    return buildRulePreview(nota.conteudo, concepts);
  }
}
