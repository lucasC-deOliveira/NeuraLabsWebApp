import type { BaralhoQuery } from '../../domain/ports/baralho-query';
import type { BaralhoRepository } from '../../domain/ports/baralho-repository';
import type { BaralhoDetail, BaralhoListItem } from '../../domain/baralho-views';
import { BaralhoNotFoundError } from '../../domain/errors';
import { normalizeBaralhoTitle } from '../../domain/services/baralho-title';
import { parseImportedBaralhos } from '../../domain/services/import-payload';

/**
 * Lista os baralhos do usuário com a contagem de cartões e os grafos de origem.
 * @example listBaralhos.execute('u1')
 */
export class ListBaralhosUseCase {
  constructor(private readonly query: BaralhoQuery) {}

  execute(userId: string): Promise<BaralhoListItem[]> {
    return this.query.listBaralhos(userId);
  }
}

/**
 * Detalha um baralho do usuário com seus cartões.
 * @example getBaralho.execute('u1', 'b1')
 */
export class GetBaralhoUseCase {
  constructor(private readonly query: BaralhoQuery) {}

  async execute(userId: string, baralhoId: string): Promise<BaralhoDetail> {
    const baralho = await this.query.getBaralho(userId, baralhoId);
    if (!baralho) throw new BaralhoNotFoundError(baralhoId);
    return baralho;
  }
}

/**
 * Cria um baralho avulso (fora de qualquer grafo), opcionalmente já com cartões.
 * @example createBaralho.execute('u1', 'Biologia', ['fc1'])
 */
export class CreateBaralhoUseCase {
  constructor(private readonly repo: BaralhoRepository) {}

  // async para a validação virar rejeição da promise, e não um throw síncrono que
  // escaparia de quem trata o erro com .catch()/.rejects.
  async execute(
    userId: string,
    titulo: string,
    flashcardIds: string[],
  ): Promise<{ baralhoId: string }> {
    return this.repo.create(userId, {
      titulo: normalizeBaralhoTitle(titulo),
      flashcardIds: flashcardIds ?? [],
    });
  }
}

/**
 * Renomeia um baralho do usuário.
 * @example renameBaralho.execute('u1', 'b1', 'Novo nome')
 */
export class RenameBaralhoUseCase {
  constructor(private readonly repo: BaralhoRepository) {}

  async execute(userId: string, baralhoId: string, titulo: string): Promise<void> {
    const renamed = await this.repo.rename(userId, baralhoId, normalizeBaralhoTitle(titulo));
    if (!renamed) throw new BaralhoNotFoundError(baralhoId);
  }
}

/**
 * Exclui um baralho do usuário. Os flashcards seguem existindo — o baralho é só
 * um agrupamento; excluí-lo não pode apagar o estudo do usuário.
 * @example deleteBaralho.execute('u1', 'b1')
 */
export class DeleteBaralhoUseCase {
  constructor(private readonly repo: BaralhoRepository) {}

  async execute(userId: string, baralhoId: string): Promise<void> {
    const removed = await this.repo.remove(userId, baralhoId);
    if (!removed) throw new BaralhoNotFoundError(baralhoId);
  }
}

/**
 * Adiciona cartões existentes a um baralho (idempotente: recolocar não duplica).
 * @example addCards.execute('u1', 'b1', ['fc1', 'fc2'])
 */
export class AddCardsToBaralhoUseCase {
  constructor(private readonly repo: BaralhoRepository) {}

  async execute(userId: string, baralhoId: string, flashcardIds: string[]): Promise<void> {
    const added = await this.repo.addCards(userId, baralhoId, flashcardIds ?? []);
    if (!added) throw new BaralhoNotFoundError(baralhoId);
  }
}

/**
 * Remove um cartão do baralho, sem excluir o flashcard.
 * @example removeCard.execute('u1', 'b1', 'fc1')
 */
export class RemoveCardFromBaralhoUseCase {
  constructor(private readonly repo: BaralhoRepository) {}

  async execute(userId: string, baralhoId: string, flashcardId: string): Promise<void> {
    const removed = await this.repo.removeCard(userId, baralhoId, flashcardId);
    if (!removed) throw new BaralhoNotFoundError(baralhoId);
  }
}

/**
 * Importa baralhos de um JSON (formato deste app ou do disrupt), criando os
 * flashcards embutidos e os baralhos que os agrupam.
 * @example importBaralhos.execute('u1', [{ titulo: 'Bio', cards: [...] }])
 */
export class ImportBaralhosUseCase {
  constructor(private readonly repo: BaralhoRepository) {}

  // async pelo mesmo motivo de CreateBaralhoUseCase: o parse falha por exceção.
  async execute(userId: string, payload: unknown): Promise<{ count: number }> {
    return this.repo.importBaralhos(userId, parseImportedBaralhos(payload));
  }
}
