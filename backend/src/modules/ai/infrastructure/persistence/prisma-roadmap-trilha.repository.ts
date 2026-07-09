import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../../../prisma/prisma.service';
import type {
  RoadmapTrilhaRepository,
  SavedTrilha,
} from '../../domain/ports/roadmap-trilha-repository';
import type { PathStep } from '../../domain/services/learning-path';

// Persists one roadmap per (graph, mode) as an ordered JSON list of steps. Owner is
// checked on read; `save` upserts on the (grafoId, modo) unique key.
@Injectable()
export class PrismaRoadmapTrilhaRepository implements RoadmapTrilhaRepository {
  constructor(private readonly prisma: PrismaService) {}

  async load(userId: string, grafoId: string, modo: string): Promise<SavedTrilha | null> {
    const row = await this.prisma.roadmapTrilha.findUnique({
      where: { _trilha_uk: { grafoId, modo } },
    });
    if (!row || row.usuarioId !== userId) return null;
    return { itens: row.itens as unknown as PathStep[], dataGeracao: row.dataGeracao };
  }

  async save(userId: string, grafoId: string, modo: string, itens: PathStep[]): Promise<Date> {
    const value = itens as unknown as Prisma.InputJsonValue;
    const row = await this.prisma.roadmapTrilha.upsert({
      where: { _trilha_uk: { grafoId, modo } },
      create: { usuarioId: userId, grafoId, modo, itens: value },
      update: { itens: value },
    });
    return row.dataGeracao;
  }
}
