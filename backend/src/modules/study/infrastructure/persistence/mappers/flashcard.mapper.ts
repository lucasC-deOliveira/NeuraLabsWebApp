import { Flashcard } from '../../../domain/entities/flashcard';
import { dbToState } from '../../../domain/services/spaced-repetition';

interface AprendizadoRow {
  fase: string;
  learningStep: number;
  intervalo: number;
  fatorEase: number;
  dificuldade: number;
  proximaRevisao: Date;
  ultimaRevisao: Date;
}

export interface FlashcardRow {
  id: string;
  usuarioId: string;
  aprendizado: AprendizadoRow[];
}

// Maps a flashcard row (with its learning state, if any) to the domain aggregate.
export function toFlashcard(row: FlashcardRow): Flashcard {
  const aprendizado = row.aprendizado[0];
  return Flashcard.create({
    id: row.id,
    ownerId: row.usuarioId,
    learningState: aprendizado ? dbToState(aprendizado) : null,
  });
}
