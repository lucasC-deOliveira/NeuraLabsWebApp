import type { EstudoRepository } from "../../domain/repositories/estudo-repository";

export interface IniciarEstudoInput {
  userId: string;
  maxNewCards?: number;
}

export interface IniciarEstudoOutput {
  sessionId: string;
  cards: unknown[];
}

const MAX_CARDS_PER_SESSION = 15;

export class IniciarEstudoUseCase {
  constructor(private repository: EstudoRepository) {}

  async execute(input: IniciarEstudoInput): Promise<IniciarEstudoOutput> {
    const sessionId = await this.repository.startSession(input.userId);

    const maxNewCards = input.maxNewCards ?? 5;

    const [dueCards, newCards] = await Promise.all([
      this.repository.getCardsForReview(input.userId),
      this.repository.getNewCardsForReview(input.userId, maxNewCards),
    ]);

    const combined = [...dueCards, ...newCards].slice(0, MAX_CARDS_PER_SESSION);

    return { sessionId, cards: combined };
  }
}
