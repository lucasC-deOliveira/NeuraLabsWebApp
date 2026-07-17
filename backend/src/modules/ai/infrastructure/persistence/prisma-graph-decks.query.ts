import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../../prisma/prisma.service';
import type { GraphDeck, GraphDecksQuery } from '../../domain/ports/graph-decks-query';

@Injectable()
export class PrismaGraphDecksQuery implements GraphDecksQuery {
  constructor(private readonly prisma: PrismaService) {}

  async listDecks(userId: string, grafoId: string): Promise<GraphDeck[]> {
    const baralhoIds = await this.resolveBaralhoIds(grafoId);
    if (baralhoIds.length === 0) return [];
    const rows = await this.prisma.baralho.findMany({
      where: { id: { in: baralhoIds }, usuarioId: userId },
      select: { id: true, titulo: true, _count: { select: { flashcards: true } } },
      orderBy: { titulo: 'asc' },
    });
    return rows.map((b) => ({ id: b.id, titulo: b.titulo, flashcardCount: b._count.flashcards }));
  }

  // Decks linked directly (BARALHO) plus those inside referenced subgraphs (GRAFO_REF).
  private async resolveBaralhoIds(grafoId: string): Promise<string[]> {
    const [direct, refs] = await Promise.all([
      this.prisma.nodeConhecimento.findMany({
        where: { tipoNode: 'BARALHO', contidoEm: { some: { grafoId } } },
        select: { referenciaId: true },
      }),
      this.prisma.nodeConhecimento.findMany({
        where: { tipoNode: 'GRAFO_REF', contidoEm: { some: { grafoId } } },
        select: { referenciaId: true },
      }),
    ]);
    const subgraphIds = refs.map((n) => n.referenciaId).filter(Boolean);
    const subgraphDecks = await this.subgraphDeckIds(subgraphIds);
    return [...direct.map((n) => n.referenciaId), ...subgraphDecks].filter(Boolean);
  }

  private async subgraphDeckIds(subgraphIds: string[]): Promise<string[]> {
    if (subgraphIds.length === 0) return [];
    const nodes = await this.prisma.nodeConhecimento.findMany({
      where: { tipoNode: 'BARALHO', contidoEm: { some: { grafoId: { in: subgraphIds } } } },
      select: { referenciaId: true },
    });
    return nodes.map((n) => n.referenciaId);
  }
}
