import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../../../prisma/prisma.service';
import type {
  DuplicateVerdictRepository,
  VerdictMap,
} from '../../domain/ports/duplicate-verdict-repository';

@Injectable()
export class PrismaDuplicateVerdictRepository implements DuplicateVerdictRepository {
  constructor(private readonly prisma: PrismaService) {}

  async load(grafoId: string): Promise<VerdictMap> {
    const row = await this.prisma.duplicateVerdictCache.findUnique({
      where: { grafoId },
      select: { dados: true },
    });
    return (row?.dados as unknown as VerdictMap) ?? {};
  }

  async save(userId: string, grafoId: string, dados: VerdictMap): Promise<void> {
    const json = dados as unknown as Prisma.InputJsonValue;
    await this.prisma.duplicateVerdictCache.upsert({
      where: { grafoId },
      create: { usuarioId: userId, grafoId, dados: json },
      update: { dados: json },
    });
  }
}
