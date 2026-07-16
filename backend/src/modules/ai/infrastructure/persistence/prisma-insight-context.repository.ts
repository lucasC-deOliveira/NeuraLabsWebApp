import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../../prisma/prisma.service';
import type {
  InsightContext,
  InsightContextNode,
  InsightContextRepository,
} from '../../domain/ports/insight-context-repository';
import { loadStructuralNodes, refIdsByType } from './structural-nodes';

const notaNode = (n: { id: string; titulo: string; conteudo: string }): InsightContextNode => ({
  id: n.id,
  tipo: 'NOTA',
  nome: n.titulo || 'Nota',
  corpo: n.conteudo,
});

const flashcardNode = (f: {
  id: string;
  pergunta: string;
  resposta: string;
}): InsightContextNode => ({ id: f.id, tipo: 'FLASHCARD', nome: f.pergunta, corpo: f.resposta });

// Proximity of the rest of the graph to the target: direct neighbors (1 hop) and
// the nodes reachable in 2 hops, used to rank which "others" the LLM sees first.
interface Proximity {
  neighbors: Set<string>;
  twoHop: Set<string>;
}

const proximityRank = (n: InsightContextNode, twoHop: Set<string>): number =>
  twoHop.has(n.id) ? 1 : 0;

// Splits the loaded nodes (minus the target) into direct neighbors and the rest,
// ordering the rest by proximity (2-hop nodes first) so the prompt's cap keeps the
// most relevant context. Sort is stable, preserving the original order per group.
function assemble(
  targetTipo: string,
  grafoNome: string,
  target: InsightContextNode,
  all: InsightContextNode[],
  proximity: Proximity,
): InsightContext {
  const rest = all.filter((c) => c.id !== target.id);
  const others = rest.filter((c) => !proximity.neighbors.has(c.id));
  others.sort((a, b) => proximityRank(b, proximity.twoHop) - proximityRank(a, proximity.twoHop));
  return {
    targetTipo,
    grafoNome,
    target,
    neighbors: rest.filter((c) => proximity.neighbors.has(c.id)),
    others,
  };
}

@Injectable()
export class PrismaInsightContextRepository implements InsightContextRepository {
  constructor(private readonly prisma: PrismaService) {}

  async loadInsightContext(
    userId: string,
    grafoId: string,
    nodeId: string,
  ): Promise<InsightContext | null> {
    const target = await this.prisma.nodeConhecimento.findFirst({
      where: { usuarioId: userId, referenciaId: nodeId, contidoEm: { some: { grafoId } } },
      select: { id: true, tipoNode: true },
    });
    if (!target) return null;
    const [ctx, grafoNome] = await Promise.all([
      this.loadContextMap(userId, grafoId),
      this.graphName(userId, grafoId),
    ]);
    const alvo = ctx.get(nodeId);
    if (!alvo) return null;
    const proximity = await this.proximity(grafoId, target.id);
    return assemble(target.tipoNode, grafoNome, alvo, [...ctx.values()], proximity);
  }

  private async graphName(userId: string, grafoId: string): Promise<string> {
    const g = await this.prisma.grafosConhecimento.findFirst({
      where: { id: grafoId, usuarioId: userId },
      select: { nome: true },
    });
    return g?.nome ?? '';
  }

  private async loadContextMap(
    userId: string,
    grafoId: string,
  ): Promise<Map<string, InsightContextNode>> {
    const [structural, rich] = await Promise.all([
      loadStructuralNodes(this.prisma, userId, grafoId),
      this.loadRichContent(userId, grafoId),
    ]);
    const nodes: InsightContextNode[] = [
      ...structural.map((n) => ({
        id: n.id,
        tipo: n.tipo,
        nome: n.nome,
        corpo: n.descricao ?? undefined,
      })),
      ...rich,
    ];
    return new Map(nodes.map((n) => [n.id, n]));
  }

  private async loadRichContent(userId: string, grafoId: string): Promise<InsightContextNode[]> {
    const ids = await refIdsByType(this.prisma, userId, grafoId);
    const [notas, flashcards] = await Promise.all([
      this.prisma.nota.findMany({
        where: { id: { in: ids.NOTA ?? [] } },
        select: { id: true, titulo: true, conteudo: true },
      }),
      this.prisma.flashcard.findMany({
        where: { id: { in: ids.FLASHCARD ?? [] } },
        select: { id: true, pergunta: true, resposta: true },
      }),
    ]);
    return [...notas.map(notaNode), ...flashcards.map(flashcardNode)];
  }

  private async proximity(grafoId: string, targetId: string): Promise<Proximity> {
    const neighborNcIds = await this.adjacentNcIds(grafoId, [targetId]);
    const twoHopNcIds = await this.adjacentNcIds(grafoId, [...neighborNcIds]);
    const [neighbors, twoHop] = await Promise.all([
      this.ncIdsToRefIds([...neighborNcIds]),
      this.ncIdsToRefIds([...twoHopNcIds]),
    ]);
    return { neighbors, twoHop };
  }

  // NodeConhecimento ids adjacent to any of `ncIds` via an edge, excluding the
  // input ids themselves (so a hop is always outward).
  private async adjacentNcIds(grafoId: string, ncIds: string[]): Promise<Set<string>> {
    if (ncIds.length === 0) return new Set();
    const edges = await this.prisma.conhecimentoAresta.findMany({
      where: { grafoId, OR: [{ nodeOrigemId: { in: ncIds } }, { nodeDestinoId: { in: ncIds } }] },
      select: { nodeOrigemId: true, nodeDestinoId: true },
    });
    const src = new Set(ncIds);
    const out = new Set<string>();
    for (const e of edges) {
      if (e.nodeOrigemId && !src.has(e.nodeOrigemId)) out.add(e.nodeOrigemId);
      if (e.nodeDestinoId && !src.has(e.nodeDestinoId)) out.add(e.nodeDestinoId);
    }
    return out;
  }

  private async ncIdsToRefIds(ncIds: string[]): Promise<Set<string>> {
    if (ncIds.length === 0) return new Set();
    const rows = await this.prisma.nodeConhecimento.findMany({
      where: { id: { in: ncIds } },
      select: { referenciaId: true },
    });
    return new Set(rows.map((n) => n.referenciaId));
  }
}
