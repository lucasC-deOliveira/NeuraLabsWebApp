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
}

export interface ProvaAttemptRepository {
  save(userId: string, attempt: ProvaAttemptInput): Promise<{ id: string }>;
}

export const PROVA_ATTEMPT_REPOSITORY = Symbol('PROVA_ATTEMPT_REPOSITORY');
