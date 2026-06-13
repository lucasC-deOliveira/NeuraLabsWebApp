import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

export interface ConfigAIData {
  apiKey: string;
  baseUrl: string;
  modelo: string;
}

@Injectable()
export class SettingsService {
  constructor(private readonly prisma: PrismaService) {}

  async getConfigAI(userId: string): Promise<ConfigAIData | null> {
    const config = await this.prisma.configAI.findUnique({ where: { usuarioId: userId } });
    return config ? { apiKey: config.apiKey, baseUrl: config.baseUrl, modelo: config.modelo } : null;
  }

  async saveConfigAI(userId: string, data: ConfigAIData): Promise<{ success: boolean }> {
    await this.prisma.configAI.upsert({
      where: { usuarioId: userId },
      create: { usuarioId: userId, ...data },
      update: data,
    });
    return { success: true };
  }

  // Config efetiva de IA: banco primeiro, fallback para env. Usado pelas features de IA.
  async resolveAIConfig(userId: string): Promise<{ apiKey: string; baseUrl: string; model: string }> {
    const db = await this.getConfigAI(userId).catch(() => null);
    return {
      apiKey: db?.apiKey ?? process.env.OPENAI_API_KEY ?? '',
      baseUrl: db?.baseUrl ?? process.env.OPENAI_BASE_URL ?? 'https://api.openai.com/v1',
      model: db?.modelo ?? process.env.OPENAI_MODEL ?? 'gpt-4o-mini',
    };
  }
}
