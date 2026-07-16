import { Injectable } from '@nestjs/common';
import { TipoNode } from '@prisma/client';
import { PrismaService } from '../../../../prisma/prisma.service';
import { cardImportanceByOwner } from '../../domain/services/card-importance';
import { nodeEdgePairs } from '../../domain/services/connected-concepts';
import { rankConceitoImportance } from '../../domain/services/conceito-importance';
import { PrismaConceitoImportanceRepository } from './prisma-conceito-importance.repository';

// Equilíbrio entre "já caiu em prova" e "o edital enfatiza". Mesmo valor do
// roadmap: a importância que a sessão de estudo usa é a que o grafo já mostra.
const PROVA_WEIGHT = 0.6;

/**
 * Read-model: o quanto cada flashcard importa, segundo os pesos do grafo — mesma
 * conta do roadmap e do selo 🔥 (frequência em provas + ênfase do edital).
 * Compartilhado (curriculum): a importância é do grafo, não de uma feature.
 *
 * O ranking é GLOBAL por usuário, uma escala só. Antes era por grafo, e a chave do
 * peso era (grafo, conceito) — o que deixou de fazer sentido quando o nó passou a
 * ser do sistema: um conceito vive em vários grafos, e o card não pertence a
 * nenhum. É a simplificação que a migração habilitou.
 * @example cards.forFlashcards('u1', ['fc1']) // Map { fc1 => 0.9 }
 */
@Injectable()
export class PrismaCardImportanceQuery {
  constructor(
    private readonly prisma: PrismaService,
    private readonly conceitos: PrismaConceitoImportanceRepository,
  ) {}

  /** Card fora do mapa = sem conceito no grafo (a maioria dos importados). */
  async forFlashcards(userId: string, flashcardIds: string[]): Promise<Map<string, number>> {
    if (flashcardIds.length === 0) return new Map();
    const cardNodes = await this.cardNodes(userId, flashcardIds);
    if (cardNodes.length === 0) return new Map();
    const ownerNodeToCard = new Map(cardNodes.map((n) => [n.id, n.referenciaId]));
    const edges = await this.incidentEdges([...ownerNodeToCard.keys()]);
    const pairs = nodeEdgePairs(edges, new Set(ownerNodeToCard.keys()));
    const conceptNodeToId = await this.conceptNodeIds(
      userId,
      pairs.map((p) => p.other),
    );
    const pesos = await this.rankAll(userId);
    return cardImportanceByOwner(pairs, ownerNodeToCard, conceptNodeToId, pesos);
  }

  private async cardNodes(
    userId: string,
    flashcardIds: string[],
  ): Promise<{ id: string; referenciaId: string }[]> {
    return this.prisma.nodeConhecimento.findMany({
      where: {
        usuarioId: userId,
        tipoNode: TipoNode.FLASHCARD,
        referenciaId: { in: flashcardIds },
      },
      select: { id: true, referenciaId: true },
    });
  }

  private async incidentEdges(
    nodeIds: string[],
  ): Promise<{ nodeOrigemId: string | null; nodeDestinoId: string | null }[]> {
    return this.prisma.conhecimentoAresta.findMany({
      where: { OR: [{ nodeOrigemId: { in: nodeIds } }, { nodeDestinoId: { in: nodeIds } }] },
      select: { nodeOrigemId: true, nodeDestinoId: true },
    });
  }

  // Dos nós do outro lado das arestas, os que são CONCEITO → nodeId → conceitoId.
  private async conceptNodeIds(userId: string, nodeIds: string[]): Promise<Map<string, string>> {
    if (nodeIds.length === 0) return new Map();
    const nodes = await this.prisma.nodeConhecimento.findMany({
      where: { usuarioId: userId, tipoNode: TipoNode.CONCEITO, id: { in: nodeIds } },
      select: { id: true, referenciaId: true },
    });
    return new Map(nodes.map((n) => [n.id, n.referenciaId]));
  }

  // Uma escala só, para todos os conceitos do usuário.
  private async rankAll(userId: string): Promise<Map<string, number>> {
    const rows = await this.conceitos.load(userId);
    const pesos = new Map<string, number>();
    for (const r of rankConceitoImportance(rows, PROVA_WEIGHT)) {
      pesos.set(r.conceitoId, r.importancia);
    }
    return pesos;
  }
}
