import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../../prisma/prisma.service';
import type { NodeContentSearchQuery } from '../../domain/ports/node-content-search-query';

type TypeSearcher = (ids: string[], term: string) => Promise<string[]>;

const contains = (term: string): { contains: string; mode: 'insensitive' } => ({
  contains: term,
  mode: 'insensitive',
});
const pluckIds = (rows: { id: string }[]): string[] => rows.map((r) => r.id);

@Injectable()
export class PrismaNodeContentSearchQuery implements NodeContentSearchQuery {
  constructor(private readonly prisma: PrismaService) {}

  async matchingNodeRefs(userId: string, grafoId: string, term: string): Promise<string[]> {
    const nodes = await this.prisma.nodeConhecimento.findMany({
      where: { grafoId, usuarioId: userId },
      select: { referenciaId: true, tipoNode: true },
    });
    const byType: Record<string, string[]> = {};
    for (const n of nodes) (byType[n.tipoNode] ??= []).push(n.referenciaId);
    const matches = await Promise.all(
      Object.entries(byType).map(([tipo, ids]) => this.searchType(tipo, ids, term)),
    );
    return [...new Set(matches.flat())];
  }

  private searchType(tipo: string, ids: string[], term: string): Promise<string[]> {
    const searcher = this.searchers[tipo];
    return searcher ? searcher(ids, term) : Promise.resolve([]);
  }

  // Per-type content match (case-insensitive); only types with a searchable
  // content field are listed — others contribute no matches.
  private readonly searchers: Record<string, TypeSearcher> = {
    NOTA: async (ids, term) =>
      pluckIds(
        await this.prisma.nota.findMany({
          where: { id: { in: ids }, conteudo: contains(term) },
          select: { id: true },
        }),
      ),
    FLASHCARD: async (ids, term) =>
      pluckIds(
        await this.prisma.flashcard.findMany({
          where: {
            id: { in: ids },
            OR: [{ pergunta: contains(term) }, { resposta: contains(term) }],
          },
          select: { id: true },
        }),
      ),
    TEXTO_BRUTO: async (ids, term) =>
      pluckIds(
        await this.prisma.textoBruto.findMany({
          where: { id: { in: ids }, texto: contains(term) },
          select: { id: true },
        }),
      ),
    CONCEITO: async (ids, term) =>
      pluckIds(
        await this.prisma.conceito.findMany({
          where: { id: { in: ids }, descricao: contains(term) },
          select: { id: true },
        }),
      ),
    ASSUNTO: async (ids, term) =>
      pluckIds(
        await this.prisma.assunto.findMany({
          where: { id: { in: ids }, descricao: contains(term) },
          select: { id: true },
        }),
      ),
    TOPICO: async (ids, term) =>
      pluckIds(
        await this.prisma.topico.findMany({
          where: { id: { in: ids }, descricao: contains(term) },
          select: { id: true },
        }),
      ),
  };
}
