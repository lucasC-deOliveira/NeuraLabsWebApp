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

// Operações executadas dentro de uma transação (Unit of Work): leitura do estado
// de aprendizado e gravação da revisão + agendamento são atômicas.
export interface StudyTxRepository {
  isCardOwnedBy(flashcardId: string, userId: string): Promise<boolean>;
  getLearningState(flashcardId: string, userId: string): Promise<ScheduleState | null>;
  createReview(review: ReviewRecord): Promise<void>;
  saveLearningState(flashcardId: string, userId: string, state: ScheduleState): Promise<void>;
}

// Port de persistência do contexto Study. Implementado por um adapter (ex.: Prisma).
export interface StudyRepository {
  findActiveSession(userId: string, sessaoId?: string): Promise<SessionRef | null>;
  withTransaction<T>(work: (tx: StudyTxRepository) => Promise<T>): Promise<T>;
}

export const STUDY_REPOSITORY = Symbol('STUDY_REPOSITORY');
