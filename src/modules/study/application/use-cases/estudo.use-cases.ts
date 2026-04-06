import { SessaoEstudo } from "../../domain/entities/estudo";
import type { EstudoRepository } from "../../domain/repositories/estudo-repository";

export interface SubmeterRevisaoInput {
  flashcardId: string;
  respostaUsuario: string;
  acertou: boolean;
  nivelConfianca: number;
  tipoErro?: string;
  tempoResposta?: number;
}

export class SubmeterRevisaoUseCase {
  constructor(private repository: EstudoRepository) {}

  async execute(input: SubmeterRevisaoInput & { sessaoId: string }): Promise<void> {
    await this.repository.submitReview({ ...input });
  }
}

export class FinalizarEstudoUseCase {
  constructor(private repository: EstudoRepository) {}

  async execute(sessionId: string): Promise<void> {
    await this.repository.endSession(sessionId);
  }
}
