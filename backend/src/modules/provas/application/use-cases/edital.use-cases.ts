import type { EditalRepository } from '../../domain/ports/edital-repository';
import type { CreateEditalInput, Edital } from '../../domain/prova';

/**
 * Creates an edital as an EDITAL node; when provaId is given, links it 1:1 to the
 * prova (REGE edge). @example createEdital.execute('u1', { titulo, programa, grafoId, provaId })
 */
export class CreateEditalUseCase {
  constructor(private readonly repo: EditalRepository) {}

  execute(userId: string, input: CreateEditalInput): Promise<{ editalId: string }> {
    return this.repo.create(userId, input);
  }
}

/**
 * Links an existing edital to a prova (1:1). Rejects when either side is already
 * linked. @example linkEditalToProva.execute('u1', 'e1', 'p1', 'g1')
 */
export class LinkEditalToProvaUseCase {
  constructor(private readonly repo: EditalRepository) {}

  async execute(
    userId: string,
    editalId: string,
    provaId: string,
    grafoId: string,
  ): Promise<{ success: boolean }> {
    await this.repo.linkToProva(userId, editalId, provaId, grafoId);
    return { success: true };
  }
}

/** Lists the user's editais (with their linked provaId, if any). */
export class ListEditaisUseCase {
  constructor(private readonly repo: EditalRepository) {}

  execute(userId: string): Promise<Edital[]> {
    return this.repo.listByUser(userId);
  }
}
