import type { ProvaRepository } from '../../domain/ports/prova-repository';
import type { CreateProvaFromParsedInput } from '../../domain/prova';

/**
 * Persists exam questions parsed from an upload, then the exam that links them.
 * @example createProvaFromParsed.execute('u1', { titulo, questoes: [...] })
 */
export class CreateProvaFromParsedUseCase {
  constructor(private readonly repo: ProvaRepository) {}

  async execute(userId: string, input: CreateProvaFromParsedInput): Promise<{ provaId: string }> {
    return { provaId: await this.repo.createFromParsed(userId, input) };
  }
}
