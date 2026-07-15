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

// Nó de um card no grafo, com o grafo a que pertence.
interface CardNode {
  id: string;
  referenciaId: string;
  grafoId: string;
}

const conceptKey = (grafoId: string, conceitoId: string): string => `${grafoId}:${conceitoId}`;

/**
 * Read-model: o quanto cada flashcard importa, segundo os pesos do grafo — mesma
 * conta do roadmap e do selo 🔥 (frequência em provas + ênfase do edital).
 * Compartilhado (curriculum): a importância é do grafo, não de uma feature.
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
    const conceptNodeToKey = await this.conceptNodeKeys(
      userId,
      pairs.map((p) => p.other),
    );
    const pesos = await this.rankGraphs(userId, graphsOf(conceptNodeToKey));
    return cardImportanceByOwner(pairs, ownerNodeToCard, conceptNodeToKey, pesos);
  }

  // Nó sem grafo fica de fora: a importância é normalizada dentro de um grafo, e
  // sem ele não há com o que comparar.
  private async cardNodes(userId: string, flashcardIds: string[]): Promise<CardNode[]> {
    const nodes = await this.prisma.nodeConhecimento.findMany({
      where: {
        usuarioId: userId,
        tipoNode: TipoNode.FLASHCARD,
        referenciaId: { in: flashcardIds },
        grafoId: { not: null },
      },
      select: { id: true, referenciaId: true, grafoId: true },
    });
    return nodes.flatMap((n) => (n.grafoId ? [{ ...n, grafoId: n.grafoId }] : []));
  }

  private async incidentEdges(
    nodeIds: string[],
  ): Promise<{ nodeOrigemId: string | null; nodeDestinoId: string | null }[]> {
    return this.prisma.conhecimentoAresta.findMany({
      where: { OR: [{ nodeOrigemId: { in: nodeIds } }, { nodeDestinoId: { in: nodeIds } }] },
      select: { nodeOrigemId: true, nodeDestinoId: true },
    });
  }

  // Dos nós do outro lado das arestas, os que são CONCEITO → nodeId → "grafo:conceito".
  private async conceptNodeKeys(userId: string, nodeIds: string[]): Promise<Map<string, string>> {
    if (nodeIds.length === 0) return new Map();
    const nodes = await this.prisma.nodeConhecimento.findMany({
      where: {
        usuarioId: userId,
        tipoNode: TipoNode.CONCEITO,
        id: { in: nodeIds },
        grafoId: { not: null },
      },
      select: { id: true, referenciaId: true, grafoId: true },
    });
    return new Map(
      nodes.flatMap((n) =>
        n.grafoId ? [[n.id, conceptKey(n.grafoId, n.referenciaId)] as const] : [],
      ),
    );
  }

  // O ranking é por grafo (a escala é normalizada dentro dele), então cada grafo
  // envolvido é ranqueado uma vez e os resultados entram no mesmo mapa.
  private async rankGraphs(userId: string, grafoIds: string[]): Promise<Map<string, number>> {
    const pesos = new Map<string, number>();
    for (const grafoId of grafoIds) {
      const rows = await this.conceitos.load(userId, grafoId);
      for (const r of rankConceitoImportance(rows, PROVA_WEIGHT)) {
        pesos.set(conceptKey(grafoId, r.conceitoId), r.importancia);
      }
    }
    return pesos;
  }
}

function graphsOf(conceptNodeToKey: Map<string, string>): string[] {
  const grafos = new Set<string>();
  for (const chave of conceptNodeToKey.values()) grafos.add(chave.split(':')[0]);
  return [...grafos];
}
