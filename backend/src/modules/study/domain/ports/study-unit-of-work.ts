import type { FlashcardRepository } from './flashcard-repository';
import type { StudySessionRepository } from './study-session-repository';

// The aggregate repositories that participate in a single transaction.
export interface StudyRepositories {
  flashcards: FlashcardRepository;
  sessions: StudySessionRepository;
}

/**
 * Unit of Work for the Study context. Runs the work atomically so that writing a
 * review (StudySession aggregate) and rescheduling a card (Flashcard aggregate)
 * commit together, even though they are separate aggregates.
 */
export interface StudyUnitOfWork {
  execute<T>(work: (repos: StudyRepositories) => Promise<T>): Promise<T>;
}

export const STUDY_UNIT_OF_WORK = Symbol('STUDY_UNIT_OF_WORK');
