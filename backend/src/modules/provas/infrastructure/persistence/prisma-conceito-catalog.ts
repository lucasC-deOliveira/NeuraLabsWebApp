import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../../prisma/prisma.service';
import type { ConceitoCatalogSource } from '../../domain/ports/conceito-catalog-source';
import type { CatalogoConceitos } from '../../domain/prova';

// Reads the user's existing ASSUNTO/TÓPICO/CONCEITO so the classifier can reuse
// them instead of duplicating. Adapter over Prisma — the only place provas
// touches the graph's entity tables directly (ACL for the catalog port).
@Injectable()
export class PrismaConceitoCatalog implements ConceitoCatalogSource {
  constructor(private readonly prisma: PrismaService) {}

  async loadCatalogo(userId: string): Promise<CatalogoConceitos> {
    const select = { id: true, nome: true } as const;
    const where = { usuarioId: userId };
    const [assuntos, topicos, conceitos] = await Promise.all([
      this.prisma.assunto.findMany({ where, select, orderBy: { nome: 'asc' } }),
      this.prisma.topico.findMany({ where, select, orderBy: { nome: 'asc' } }),
      this.prisma.conceito.findMany({ where, select, orderBy: { nome: 'asc' } }),
    ]);
    return { assuntos, topicos, conceitos };
  }
}
