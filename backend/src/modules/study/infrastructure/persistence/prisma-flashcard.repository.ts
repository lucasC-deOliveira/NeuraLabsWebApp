import type { Prisma } from '@prisma/client';
import type { Flashcard } from '../../domain/entities/flashcard';
import type { FlashcardRepository } from '../../domain/ports/flashcard-repository';
import { toFlashcard } from './mappers/flashcard.mapper';
import { toAprendizadoColumns } from './mappers/learning-state.mapper';

// Transactional adapter for the Flashcard aggregate. Bound to one
// Prisma.TransactionClient so it shares the unit of work's transaction.
export class PrismaFlashcardRepository implements FlashcardRepository {
  constructor(private readonly tx: Prisma.TransactionClient) {}

  async findOwnedBy(flashcardId: string, userId: string): Promise<Flashcard | null> {
    const row = await this.tx.flashcard.findFirst({
      where: { id: flashcardId, usuarioId: userId },
      select: {
        id: true,
        usuarioId: true,
        aprendizado: { where: { usuarioId: userId } },
      },
    });
    return row ? toFlashcard(row) : null;
  }

  async save(flashcard: Flashcard): Promise<void> {
    const state = flashcard.learningState;
    if (!state) return; // a card never reviewed has no learning state to persist
    const columns = toAprendizadoColumns(state);
    await this.tx.aprendizadoFlashcard.upsert({
      where: { flashcardId_usuarioId: { flashcardId: flashcard.id, usuarioId: flashcard.ownerId } },
      create: { flashcardId: flashcard.id, usuarioId: flashcard.ownerId, ...columns },
      update: columns,
    });
  }
}
