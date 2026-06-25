import { NotaNotFoundError } from '../../domain/errors';
import type { NotaRepository } from '../../domain/ports/nota-repository';
import type { FlashcardCreated } from '../../domain/note-views';
import { buildRulePreview } from '../../../../content/flashcard-gen';

/**
 * Generates rule-based flashcards from a note's content and saves them.
 * @example generateFlashcards.execute('u1', 'n1')
 */
export class GenerateFlashcardsFromNotaUseCase {
  constructor(private readonly repo: NotaRepository) {}

  async execute(userId: string, notaId: string): Promise<{ flashcards: FlashcardCreated[] }> {
    const nota = await this.repo.loadNotaContent(userId, notaId);
    if (!nota) throw new NotaNotFoundError();
    const concepts = await this.repo.loadConcepts(userId);
    const cards = buildRulePreview(nota.conteudo, concepts).map((p) => ({
      pergunta: p.pergunta,
      resposta: p.resposta,
      conceitoId: p.conceitoId,
    }));
    return { flashcards: await this.repo.createFlashcards(userId, cards) };
  }
}
