import { Injectable } from '@nestjs/common';
import { TipoNode } from '@prisma/client';
import { PrismaService } from '../../../../prisma/prisma.service';
import type { CardConceptSource } from '../../domain/ports/card-concept-source';

/**
 * Resolve o conceito de cada flashcard pelas arestas FLASHCARD→CONCEITO do grafo (o
 * `conceitoId` relacional é nulo no acervo real). Um card pega o PRIMEIRO conceito
 * ligado — o bastante para o interleaving variar entre conceitos.
 * @example query.conceptsFor('u1', ['fc1']) // Map { fc1 => 'Recursão' }
 */
@Injectable()
export class PrismaCardConceptQuery implements CardConceptSource {
  constructor(private readonly prisma: PrismaService) {}

  async conceptsFor(userId: string, flashcardIds: string[]): Promise<Map<string, string>> {
    if (flashcardIds.length === 0) return new Map();
    const cardNodes = await this.prisma.nodeConhecimento.findMany({
      where: {
        usuarioId: userId,
        tipoNode: TipoNode.FLASHCARD,
        referenciaId: { in: flashcardIds },
      },
      select: { id: true, referenciaId: true },
    });
    if (cardNodes.length === 0) return new Map();
    const nodeToCard = new Map(cardNodes.map((n) => [n.id, n.referenciaId]));
    const cardToRef = await this.cardConceptRefs(userId, nodeToCard);
    return this.namesByCard(userId, cardToRef);
  }

  // flashcardId → id do conceito (o primeiro ligado no grafo).
  private async cardConceptRefs(
    userId: string,
    nodeToCard: Map<string, string>,
  ): Promise<Map<string, string>> {
    const edges = await this.prisma.conhecimentoAresta.findMany({
      where: {
        nodeOrigemId: { in: [...nodeToCard.keys()] },
        nodeDestino: { tipoNode: TipoNode.CONCEITO },
      },
      select: { nodeOrigemId: true, nodeDestino: { select: { referenciaId: true } } },
    });
    const cardToRef = new Map<string, string>();
    for (const e of edges) {
      const card = e.nodeOrigemId ? nodeToCard.get(e.nodeOrigemId) : undefined;
      if (card && e.nodeDestino && !cardToRef.has(card))
        cardToRef.set(card, e.nodeDestino.referenciaId);
    }
    return cardToRef;
  }

  private async namesByCard(
    userId: string,
    cardToRef: Map<string, string>,
  ): Promise<Map<string, string>> {
    const refIds = [...new Set(cardToRef.values())];
    if (refIds.length === 0) return new Map();
    const conceitos = await this.prisma.conceito.findMany({
      where: { usuarioId: userId, id: { in: refIds } },
      select: { id: true, nome: true },
    });
    const nameByRef = new Map(conceitos.map((c) => [c.id, c.nome]));
    const out = new Map<string, string>();
    for (const [card, ref] of cardToRef) {
      const nome = nameByRef.get(ref);
      if (nome) out.set(card, nome);
    }
    return out;
  }
}
