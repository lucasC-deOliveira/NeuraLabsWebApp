import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../../prisma/prisma.service';
import type {
  DeckClassificationRepository,
  DeckForClassification,
} from '../../domain/ports/deck-classification-repository';

@Injectable()
export class PrismaDeckClassificationRepository implements DeckClassificationRepository {
  constructor(private readonly prisma: PrismaService) {}

  async graphExists(userId: string, grafoId: string): Promise<boolean> {
    const grafo = await this.prisma.grafosConhecimento.findFirst({
      where: { id: grafoId, usuarioId: userId },
      select: { id: true },
    });
    return grafo !== null;
  }

  // No card cap on purpose: chunking happens in the use-case, and a stable order
  // keeps the chunk sequence deterministic across runs.
  async loadDeck(userId: string, baralhoId: string): Promise<DeckForClassification | null> {
    const baralho = await this.prisma.baralho.findFirst({
      where: { id: baralhoId, usuarioId: userId },
      select: {
        titulo: true,
        flashcards: {
          select: { id: true, pergunta: true, resposta: true },
          orderBy: { id: 'asc' },
        },
      },
    });
    return baralho ? { titulo: baralho.titulo, cards: baralho.flashcards } : null;
  }

  async loadClassifiedCardIds(userId: string, cardIds: string[]): Promise<Set<string>> {
    const nodes = await this.prisma.nodeConhecimento.findMany({
      where: {
        usuarioId: userId,
        tipoNode: 'FLASHCARD',
        referenciaId: { in: cardIds },
        arestasOrigem: { some: { tipoRelacao: 'DEFINE', nodeDestino: { tipoNode: 'CONCEITO' } } },
      },
      select: { referenciaId: true },
    });
    return new Set(nodes.map((n) => n.referenciaId));
  }
}
