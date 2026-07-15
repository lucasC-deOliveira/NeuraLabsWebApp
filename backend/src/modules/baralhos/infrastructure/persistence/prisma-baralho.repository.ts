import { Injectable } from '@nestjs/common';
import { Prisma, TipoNode } from '@prisma/client';
import { PrismaService } from '../../../../prisma/prisma.service';
import type { BaralhoRepository } from '../../domain/ports/baralho-repository';
import type { CreateBaralhoInput, ImportedBaralho, ImportedCard } from '../../domain/baralho-views';

@Injectable()
export class PrismaBaralhoRepository implements BaralhoRepository {
  constructor(private readonly prisma: PrismaService) {}

  async create(userId: string, input: CreateBaralhoInput): Promise<{ baralhoId: string }> {
    const ids = await this.ownedCardIds(userId, input.flashcardIds);
    const { id } = await this.prisma.baralho.create({
      data: {
        usuarioId: userId,
        titulo: input.titulo,
        flashcards: { connect: ids.map((cardId) => ({ id: cardId })) },
      },
      select: { id: true },
    });
    return { baralhoId: id };
  }

  async rename(userId: string, baralhoId: string, titulo: string): Promise<boolean> {
    const { count } = await this.prisma.baralho.updateMany({
      where: { id: baralhoId, usuarioId: userId },
      data: { titulo },
    });
    return count > 0;
  }

  // Os flashcards seguem existindo: o baralho é só um agrupamento, e excluí-lo não
  // pode apagar o estudo do usuário. Some o baralho e o nó que o espelha nos grafos.
  async remove(userId: string, baralhoId: string): Promise<boolean> {
    if (!(await this.owns(userId, baralhoId))) return false;
    await this.prisma.$transaction(async (tx) => {
      await removeBaralhoNodes(tx, userId, baralhoId);
      await tx.baralho.delete({ where: { id: baralhoId } });
    });
    return true;
  }

  async addCards(userId: string, baralhoId: string, flashcardIds: string[]): Promise<boolean> {
    if (!(await this.owns(userId, baralhoId))) return false;
    const ids = await this.ownedCardIds(userId, flashcardIds);
    await this.prisma.baralho.update({
      where: { id: baralhoId },
      data: { flashcards: { connect: ids.map((cardId) => ({ id: cardId })) } },
    });
    return true;
  }

  async removeCard(userId: string, baralhoId: string, flashcardId: string): Promise<boolean> {
    if (!(await this.owns(userId, baralhoId))) return false;
    await this.prisma.baralho.update({
      where: { id: baralhoId },
      data: { flashcards: { disconnect: { id: flashcardId } } },
    });
    return true;
  }

  async importBaralhos(userId: string, baralhos: ImportedBaralho[]): Promise<{ count: number }> {
    await this.prisma.$transaction(async (tx) => {
      for (const baralho of baralhos) await createImported(tx, userId, baralho);
    });
    return { count: baralhos.length };
  }

  private async owns(userId: string, baralhoId: string): Promise<boolean> {
    const found = await this.prisma.baralho.findFirst({
      where: { id: baralhoId, usuarioId: userId },
      select: { id: true },
    });
    return found !== null;
  }

  // Só conecta cartões do próprio usuário: ids alheios são descartados em silêncio,
  // para um id forjado no payload nunca puxar o flashcard de outra pessoa.
  private async ownedCardIds(userId: string, ids: string[]): Promise<string[]> {
    if (ids.length === 0) return [];
    const rows = await this.prisma.flashcard.findMany({
      where: { usuarioId: userId, id: { in: ids } },
      select: { id: true },
    });
    return rows.map((r) => r.id);
  }
}

// Cartões importados nascem sem conceito: o JSON não traz a hierarquia deste app.
async function createImportedCards(
  tx: Prisma.TransactionClient,
  userId: string,
  cards: ImportedCard[],
): Promise<string[]> {
  const created = await Promise.all(
    cards.map((card) =>
      tx.flashcard.create({
        data: { usuarioId: userId, pergunta: card.pergunta, resposta: card.resposta },
        select: { id: true },
      }),
    ),
  );
  return created.map((card) => card.id);
}

async function createImported(
  tx: Prisma.TransactionClient,
  userId: string,
  baralho: ImportedBaralho,
): Promise<void> {
  const cardIds = await createImportedCards(tx, userId, baralho.cards);
  await tx.baralho.create({
    data: {
      usuarioId: userId,
      titulo: baralho.titulo,
      flashcards: { connect: cardIds.map((id) => ({ id })) },
    },
  });
}

// Remove os nós BARALHO (e suas arestas) que espelham o baralho nos grafos —
// referenciaId não tem FK, então nada some sozinho e o nó ficaria órfão.
async function removeBaralhoNodes(
  tx: Prisma.TransactionClient,
  userId: string,
  baralhoId: string,
): Promise<void> {
  const nodes = await tx.nodeConhecimento.findMany({
    where: { usuarioId: userId, tipoNode: TipoNode.BARALHO, referenciaId: baralhoId },
    select: { id: true },
  });
  if (nodes.length === 0) return;
  const ids = nodes.map((n) => n.id);
  await tx.conhecimentoAresta.deleteMany({
    where: { OR: [{ nodeOrigemId: { in: ids } }, { nodeDestinoId: { in: ids } }] },
  });
  await tx.nodeConhecimento.deleteMany({ where: { id: { in: ids } } });
}
