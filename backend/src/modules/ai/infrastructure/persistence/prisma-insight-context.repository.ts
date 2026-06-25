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

// Splits the loaded nodes (minus the target) into direct neighbors and the rest.
function assemble(
  targetTipo: string,
  target: InsightContextNode,
  all: InsightContextNode[],
  neighborRefIds: Set<string>,
): InsightContext {
  const rest = all.filter((c) => c.id !== target.id);
  return {
    targetTipo,
    target,
    neighbors: rest.filter((c) => neighborRefIds.has(c.id)),
    others: rest.filter((c) => !neighborRefIds.has(c.id)),
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
      where: { grafoId, usuarioId: userId, referenciaId: nodeId },
      select: { id: true, tipoNode: true },
    });
    if (!target) return null;
    const ctx = await this.loadContextMap(userId, grafoId);
    const alvo = ctx.get(nodeId);
    if (!alvo) return null;
    const neighborRefIds = await this.neighborRefIds(grafoId, target.id);
    return assemble(target.tipoNode, alvo, [...ctx.values()], neighborRefIds);
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

  private async neighborRefIds(grafoId: string, targetId: string): Promise<Set<string>> {
    const edges = await this.prisma.conhecimentoAresta.findMany({
      where: { grafoId, OR: [{ nodeOrigemId: targetId }, { nodeDestinoId: targetId }] },
      select: { nodeOrigemId: true, nodeDestinoId: true },
    });
    const ncIds = edges
      .map((e) => (e.nodeOrigemId === targetId ? e.nodeDestinoId : e.nodeOrigemId))
      .filter((id): id is string => !!id);
    const ncNodes = await this.prisma.nodeConhecimento.findMany({
      where: { id: { in: ncIds } },
      select: { referenciaId: true },
    });
    return new Set(ncNodes.map((n) => n.referenciaId));
  }
}
