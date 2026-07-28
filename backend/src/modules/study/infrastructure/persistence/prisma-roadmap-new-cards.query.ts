import { Injectable } from '@nestjs/common';
import { TipoNode } from '@prisma/client';
import { PrismaService } from '../../../../prisma/prisma.service';
import {
  NEW_CARD_SCHEDULE,
  NO_IMPORTANCE,
  type StudyCardView,
} from '../../domain/ports/study-card-query';
import type { RoadmapNewCardsQuery } from '../../domain/ports/roadmap-new-cards-query';
import {
  pickNewCards,
  groupNewByConcept,
  type ConceptLink,
  type ConceptNewCards,
} from '../../domain/services/roadmap-new-cards';

// A trilha do roadmap guarda os passos como { nodeId } (= conceitoId), já ordenados.
interface TrilhaStep {
  nodeId: string;
}

type FlashcardRow = { id: string; pergunta: string; resposta: string };

function toNewView(fc: FlashcardRow, conceito: string | null): StudyCardView {
  return { ...fc, conceito, ...NEW_CARD_SCHEDULE, ...NO_IMPORTANCE };
}

/**
 * Cards novos de um grafo na ordem do roadmap. O `conceitoId` relacional é nulo para o
 * usuário real (os conceitos vivem em arestas do grafo), então o mapa conceito→cards
 * vem das arestas FLASHCARD→CONCEITO — o mesmo caminho da importância/composição.
 * @example query.findByRoadmap('u1', 'g1', 'prova', 10)
 */
@Injectable()
export class PrismaRoadmapNewCardsQuery implements RoadmapNewCardsQuery {
  constructor(private readonly prisma: PrismaService) {}

  async findByRoadmap(
    userId: string,
    grafoId: string,
    modo: string,
    limit: number,
  ): Promise<StudyCardView[]> {
    const order = await this.roadmapConceptOrder(userId, grafoId, modo);
    if (order.length === 0) return [];
    const conceptNodes = await this.conceptNodes(userId, order);
    const links = await this.flashcardLinks(grafoId, [...conceptNodes.keys()]);
    const isNew = await this.keepNew(
      userId,
      links.map((l) => l.flashcardId),
    );
    const grouped = groupNewByConcept(order, conceptNodes, links, isNew);
    return this.loadCards(pickNewCards(grouped, limit), grouped);
  }

  private async roadmapConceptOrder(
    userId: string,
    grafoId: string,
    modo: string,
  ): Promise<string[]> {
    const row = await this.prisma.roadmapTrilha.findUnique({
      where: { _trilha_uk: { grafoId, modo } },
      select: { usuarioId: true, itens: true },
    });
    if (!row || row.usuarioId !== userId) return [];
    const steps = (row.itens as unknown as TrilhaStep[]) ?? [];
    return steps.map((s) => s.nodeId).filter((id): id is string => typeof id === 'string');
  }

  // conceptNodeId → conceitoId, para os conceitos da trilha.
  private async conceptNodes(userId: string, conceitoIds: string[]): Promise<Map<string, string>> {
    const nodes = await this.prisma.nodeConhecimento.findMany({
      where: { usuarioId: userId, tipoNode: TipoNode.CONCEITO, referenciaId: { in: conceitoIds } },
      select: { id: true, referenciaId: true },
    });
    return new Map(nodes.map((n) => [n.id, n.referenciaId]));
  }

  // Arestas FLASHCARD→CONCEITO (destino = conceito) cujo card está neste grafo.
  private async flashcardLinks(grafoId: string, conceptNodeIds: string[]): Promise<ConceptLink[]> {
    if (conceptNodeIds.length === 0) return [];
    const edges = await this.prisma.conhecimentoAresta.findMany({
      where: {
        nodeDestinoId: { in: conceptNodeIds },
        nodeOrigem: { tipoNode: TipoNode.FLASHCARD, contidoEm: { some: { grafoId } } },
      },
      select: { nodeDestinoId: true, nodeOrigem: { select: { referenciaId: true } } },
    });
    return edges.flatMap((e) =>
      e.nodeDestinoId && e.nodeOrigem
        ? [{ conceptNodeId: e.nodeDestinoId, flashcardId: e.nodeOrigem.referenciaId }]
        : [],
    );
  }

  // Dos candidatos, os que NÃO têm aprendizado (nunca revisados) = novos.
  private async keepNew(userId: string, flashcardIds: string[]): Promise<Set<string>> {
    if (flashcardIds.length === 0) return new Set();
    const learned = await this.prisma.aprendizadoFlashcard.findMany({
      where: { usuarioId: userId, flashcardId: { in: flashcardIds } },
      select: { flashcardId: true },
    });
    const learnedSet = new Set(learned.map((l) => l.flashcardId));
    return new Set(flashcardIds.filter((id) => !learnedSet.has(id)));
  }

  private async loadCards(cardIds: string[], grouped: ConceptNewCards[]): Promise<StudyCardView[]> {
    if (cardIds.length === 0) return [];
    const rows = await this.prisma.flashcard.findMany({
      where: { id: { in: cardIds } },
      select: { id: true, pergunta: true, resposta: true },
    });
    const byId = new Map(rows.map((r) => [r.id, r]));
    const nomeByCard = await this.conceitoNameByCard(grouped);
    return cardIds.flatMap((id) => {
      const fc = byId.get(id);
      return fc ? [toNewView(fc, nomeByCard.get(id) ?? null)] : [];
    });
  }

  // flashcardId → nome do conceito (para o interleaving variar por conceito).
  private async conceitoNameByCard(grouped: ConceptNewCards[]): Promise<Map<string, string>> {
    const conceitos = await this.prisma.conceito.findMany({
      where: { id: { in: grouped.map((g) => g.conceitoId) } },
      select: { id: true, nome: true },
    });
    const nomeById = new Map(conceitos.map((c) => [c.id, c.nome]));
    const out = new Map<string, string>();
    for (const g of grouped) {
      const nome = nomeById.get(g.conceitoId);
      if (nome) g.cardIds.forEach((cardId) => out.set(cardId, nome));
    }
    return out;
  }
}
