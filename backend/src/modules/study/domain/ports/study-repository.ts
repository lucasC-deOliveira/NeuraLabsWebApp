import type { ScheduleState } from '../services/spaced-repetition';

export interface SessionRef {
  id: string;
}

export interface ReviewRecord {
  flashcardId: string;
  sessaoId: string;
  respostaUsuario: string;
  acertou: boolean;
  nivelConfianca: number;
  tempoResposta?: number;
}

// Operations executed within a transaction (Unit of Work): reading the learning
// state and writing the review + scheduling are atomic.
export interface StudyTxRepository {
  isCardOwnedBy(flashcardId: string, userId: string): Promise<boolean>;
  getLearningState(flashcardId: string, userId: string): Promise<ScheduleState | null>;
  createReview(review: ReviewRecord): Promise<void>;
  saveLearningState(flashcardId: string, userId: string, state: ScheduleState): Promise<void>;
}

// Persistence port for the Study context. Implemented by an adapter (e.g. Prisma).
export interface StudyRepository {
  findActiveSession(userId: string, sessaoId?: string): Promise<SessionRef | null>;
  withTransaction<T>(work: (tx: StudyTxRepository) => Promise<T>): Promise<T>;
}

export const STUDY_REPOSITORY = Symbol('STUDY_REPOSITORY');
