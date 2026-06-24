import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../../prisma/prisma.service';
import type { GraphVisualStateRepository } from '../../domain/ports/graph-visual-state-repository';

@Injectable()
export class PrismaGraphVisualStateRepository implements GraphVisualStateRepository {
  constructor(private readonly prisma: PrismaService) {}

  async save(userId: string, grafoId: string, serialized: string): Promise<void> {
    await this.prisma.grafosConhecimento.updateMany({
      where: { id: grafoId, usuarioId: userId },
      data: { estadoVisual: serialized },
    });
  }

  async loadRaw(userId: string, grafoId: string): Promise<string | null> {
    const g = await this.prisma.grafosConhecimento.findFirst({
      where: { id: grafoId, usuarioId: userId },
      select: { estadoVisual: true },
    });
    return g?.estadoVisual ?? null;
  }
}
