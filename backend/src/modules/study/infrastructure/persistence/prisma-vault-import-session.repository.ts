import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../../prisma/prisma.service';
import type { VaultImportSessionRepository } from '../../domain/ports/vault-import-session-repository';

// Adapter: creates a study session preserving the offline (vault) timestamps.
@Injectable()
export class PrismaVaultImportSessionRepository implements VaultImportSessionRepository {
  constructor(private readonly prisma: PrismaService) {}

  createSession(userId: string, startedAt: Date, endedAt: Date): Promise<{ id: string }> {
    return this.prisma.sessaoEstudo.create({
      data: { usuarioId: userId, dataInicio: startedAt, dataFim: endedAt },
      select: { id: true },
    });
  }
}
