import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../../prisma/prisma.service';
import type { RoadmapOption, RoadmapOptionsQuery } from '../../domain/ports/roadmap-options-query';
import { roadmapLabel, roadmapScopeIds } from '../../domain/services/roadmap-label';

/**
 * Lista os roadmaps já gerados de um grafo (uma opção por trilha), com rótulos que
 * resolvem os títulos de prova/edital do escopo. É o que o plano oferece como "escopo".
 * @example query.list('u1', 'g1')
 */
@Injectable()
export class PrismaRoadmapOptionsQuery implements RoadmapOptionsQuery {
  constructor(private readonly prisma: PrismaService) {}

  async list(userId: string, grafoId: string): Promise<RoadmapOption[]> {
    const trilhas = await this.prisma.roadmapTrilha.findMany({
      where: { usuarioId: userId, grafoId },
      select: { modo: true },
    });
    const names = await this.resolveNames(
      userId,
      trilhas.map((t) => t.modo),
    );
    return trilhas.map((t) => ({ modo: t.modo, label: roadmapLabel(t.modo, names) }));
  }

  // Títulos das provas/editais referenciados nas chaves, num mapa id→título.
  private async resolveNames(userId: string, modos: string[]): Promise<Map<string, string>> {
    const ids = new Set<string>();
    for (const m of modos) {
      const { provaId, editalId } = roadmapScopeIds(m);
      if (provaId) ids.add(provaId);
      if (editalId) ids.add(editalId);
    }
    if (ids.size === 0) return new Map();
    const where = { usuarioId: userId, id: { in: [...ids] } };
    const [provas, editais] = await Promise.all([
      this.prisma.prova.findMany({ where, select: { id: true, titulo: true } }),
      this.prisma.edital.findMany({ where, select: { id: true, titulo: true } }),
    ]);
    return new Map([...provas, ...editais].map((x) => [x.id, x.titulo]));
  }
}
