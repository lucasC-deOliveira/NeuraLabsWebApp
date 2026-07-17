import { Injectable } from '@nestjs/common';
import type { TipoNode } from '@prisma/client';
import { PrismaService } from '../../../../prisma/prisma.service';
import type {
  EmbeddingUpsert,
  NodeEmbeddingRepository,
  StoredEmbedding,
} from '../../domain/ports/node-embedding-repository';

@Injectable()
export class PrismaNodeEmbeddingRepository implements NodeEmbeddingRepository {
  constructor(private readonly prisma: PrismaService) {}

  async load(userId: string, referenciaIds: string[]): Promise<StoredEmbedding[]> {
    const rows = await this.prisma.nodeEmbedding.findMany({
      where: { usuarioId: userId, referenciaId: { in: referenciaIds } },
      select: { referenciaId: true, assinatura: true, vetor: true },
    });
    return rows.map((r) => ({
      referenciaId: r.referenciaId,
      assinatura: r.assinatura,
      vetor: r.vetor,
    }));
  }

  async upsertMany(userId: string, rows: EmbeddingUpsert[]): Promise<void> {
    for (const r of rows) {
      const data = { assinatura: r.assinatura, vetor: r.vetor, tipoNode: r.tipoNode as TipoNode };
      await this.prisma.nodeEmbedding.upsert({
        where: { _embedding_unique: { usuarioId: userId, referenciaId: r.referenciaId } },
        create: { usuarioId: userId, referenciaId: r.referenciaId, ...data },
        update: data,
      });
    }
  }
}
