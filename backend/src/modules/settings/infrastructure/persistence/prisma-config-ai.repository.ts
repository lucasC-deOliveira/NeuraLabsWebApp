import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../../prisma/prisma.service';
import type { ConfigAi, ConfigAiRepository } from '../../domain/ports/config-ai-repository';

@Injectable()
export class PrismaConfigAiRepository implements ConfigAiRepository {
  constructor(private readonly prisma: PrismaService) {}

  async load(userId: string): Promise<ConfigAi | null> {
    const config = await this.prisma.configAI.findUnique({ where: { usuarioId: userId } });
    return config
      ? { apiKey: config.apiKey, baseUrl: config.baseUrl, modelo: config.modelo }
      : null;
  }

  async save(userId: string, data: ConfigAi): Promise<void> {
    await this.prisma.configAI.upsert({
      where: { usuarioId: userId },
      create: { usuarioId: userId, ...data },
      update: data,
    });
  }
}
