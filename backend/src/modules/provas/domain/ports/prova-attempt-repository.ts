// Persistência de uma tentativa de prova (quiz) e suas respostas por questão.

export interface AnswerInput {
  questaoId: string;
  respostaEscolhida: string;
  acertou: boolean;
  tempoRespostaMs: number | null;
}

export interface ProvaAttemptInput {
  provaId: string;
  acertos: number;
  total: number;
  tempoTotalMs: number;
  respostas: AnswerInput[];
  localAttemptId?: string;
  completedAt?: string;
}

export interface ProvaAttemptRepository {
  save(userId: string, attempt: ProvaAttemptInput): Promise<RecordedProvaAttempt>;
  listForGraph(userId: string, graphId: string, after: string): Promise<ServerExamAttempt[]>;
}

export interface ServerExamAttempt extends Omit<
  ProvaAttemptInput,
  'localAttemptId' | 'completedAt'
> {
  id: string;
  completedAt: string;
}

export interface RecordedProvaAttempt {
  id: string;
  alreadyRecorded?: true;
}

export const PROVA_ATTEMPT_REPOSITORY = Symbol('PROVA_ATTEMPT_REPOSITORY');
