import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../../prisma/prisma.service';
import type {
  BaralhoForPopulation,
  BaralhoPopulationRepository,
} from '../../domain/ports/baralho-population-repository';

@Injectable()
export class PrismaBaralhoPopulationRepository implements BaralhoPopulationRepository {
  constructor(private readonly prisma: PrismaService) {}

  async graphExists(userId: string, grafoId: string): Promise<boolean> {
    const grafo = await this.prisma.grafosConhecimento.findFirst({
      where: { id: grafoId, usuarioId: userId },
      select: { id: true },
    });
    return grafo !== null;
  }

  async loadBaralho(userId: string, baralhoId: string): Promise<BaralhoForPopulation | null> {
    return this.prisma.baralho.findFirst({
      where: { id: baralhoId, usuarioId: userId },
      select: {
        titulo: true,
        flashcards: { select: { id: true, pergunta: true, resposta: true }, take: 150 },
      },
    });
  }

  async loadFlashcardNodeRefs(grafoId: string, flashcardIds: string[]): Promise<Set<string>> {
    const nodes = await this.prisma.nodeConhecimento.findMany({
      where: {
        tipoNode: 'FLASHCARD',
        referenciaId: { in: flashcardIds },
        contidoEm: { some: { grafoId } },
      },
      select: { referenciaId: true },
    });
    return new Set(nodes.map((n) => n.referenciaId));
  }
}
