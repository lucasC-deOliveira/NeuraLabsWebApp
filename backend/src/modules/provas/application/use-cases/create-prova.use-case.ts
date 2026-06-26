import type { ProvaRepository } from '../../domain/ports/prova-repository';
import type { CreateProvaInput } from '../../domain/prova';

/**
 * Creates an exam from a selection of existing question ids.
 * @example createProva.execute('u1', { titulo, questaoIds: ['q1'] })
 */
export class CreateProvaUseCase {
  constructor(private readonly repo: ProvaRepository) {}

  async execute(userId: string, input: CreateProvaInput): Promise<{ provaId: string }> {
    return { provaId: await this.repo.create(userId, input) };
  }
}
