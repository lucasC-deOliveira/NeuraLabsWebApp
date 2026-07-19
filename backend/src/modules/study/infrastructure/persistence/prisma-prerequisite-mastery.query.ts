import { Inject, Injectable } from '@nestjs/common';
import { TipoNode } from '@prisma/client';
import { PrismaService } from '../../../../prisma/prisma.service';
import {
  CARD_MASTERY_CALCULATOR,
  type CardMasteryCalculator,
} from '../../domain/ports/card-mastery-calculator';
import type { PrerequisiteMasteryQuery } from '../../domain/ports/prerequisite-mastery-query';
import type { ConceptPrerequisites } from '../../domain/services/prerequisite-readiness';

// A --PREREQUISITO--> B significa "A é pré-requisito de B" (mesma direção que o
// AddMissingPrerequisiteUseCase grava).
const PREREQUISITE = 'PREREQUISITO';
const DEFINES = 'DEFINE';

interface PrerequisiteEdge {
  conceitoNome: string;
  prereqNome: string;
  prereqConceitoId: string;
}

interface LearningRow {
  flashcardId: string;
  dificuldade: number;
  intervalo: number;
  proximaRevisao: Date;
}

/**
 * Pré-requisitos de cada conceito, com o quanto o usuário domina cada um.
 *
 * O domínio NÃO vem de `NodeConhecimento.nivelDominio`: essa coluna está zerada no
 * banco, porque a propagação de domínio roda em memória ao montar a view do grafo
 * e nunca é persistida. Ler dali marcaria todo pré-requisito como não dominado e
 * empurraria a fila inteira para o fim, em silêncio. Aqui o domínio é calculado da
 * fonte real: o desempenho SM-2 dos flashcards que DEFINEM o conceito.
 * @example query.forConcepts('u1', ['Dijkstra'])
 */
@Injectable()
export class PrismaPrerequisiteMasteryQuery implements PrerequisiteMasteryQuery {
  constructor(
    private readonly prisma: PrismaService,
    @Inject(CARD_MASTERY_CALCULATOR) private readonly calculator: CardMasteryCalculator,
  ) {}

  async forConcepts(userId: string, conceptNames: string[]): Promise<ConceptPrerequisites> {
    if (conceptNames.length === 0) return new Map();
    const edges = await this.loadPrerequisiteEdges(userId, conceptNames);
    if (edges.length === 0) return new Map();
    const ids = edges.map((e) => e.prereqConceitoId);
    return groupByConcept(edges, await this.masteryByConcept(userId, ids));
  }

  // Arestas PREREQUISITO que chegam nos conceitos pedidos, com o nome dos dois lados.
  private async loadPrerequisiteEdges(
    userId: string,
    conceptNames: string[],
  ): Promise<PrerequisiteEdge[]> {
    const targets = await this.conceptNodesByName(userId, conceptNames);
    if (targets.size === 0) return [];
    const rows = await this.prisma.conhecimentoAresta.findMany({
      where: {
        tipoRelacao: PREREQUISITE,
        nodeDestinoId: { in: [...targets.keys()] },
        nodeOrigem: { usuarioId: userId, tipoNode: TipoNode.CONCEITO },
      },
      select: { nodeDestinoId: true, nodeOrigem: { select: { referenciaId: true } } },
    });
    return this.namePrerequisites(rows, targets);
  }

  // nodeId do CONCEITO → nome, para os nomes pedidos.
  private async conceptNodesByName(
    userId: string,
    conceptNames: string[],
  ): Promise<Map<string, string>> {
    const nomeByConceitoId = await this.conceptIdsByName(userId, conceptNames);
    const nodes = await this.prisma.nodeConhecimento.findMany({
      where: {
        usuarioId: userId,
        tipoNode: TipoNode.CONCEITO,
        referenciaId: { in: [...nomeByConceitoId.keys()] },
      },
      select: { id: true, referenciaId: true },
    });
    return remap(nodes, nomeByConceitoId);
  }

  private async conceptIdsByName(
    userId: string,
    conceptNames: string[],
  ): Promise<Map<string, string>> {
    const conceitos = await this.prisma.conceito.findMany({
      where: { usuarioId: userId, nome: { in: conceptNames } },
      select: { id: true, nome: true },
    });
    return new Map(conceitos.map((c) => [c.id, c.nome]));
  }

  private async namePrerequisites(
    rows: { nodeDestinoId: string | null; nodeOrigem: { referenciaId: string } | null }[],
    targets: Map<string, string>,
  ): Promise<PrerequisiteEdge[]> {
    const prereqIds = rows.flatMap((r) => (r.nodeOrigem ? [r.nodeOrigem.referenciaId] : []));
    if (prereqIds.length === 0) return [];
    const conceitos = await this.prisma.conceito.findMany({
      where: { id: { in: prereqIds } },
      select: { id: true, nome: true },
    });
    const nomeById = new Map(conceitos.map((c) => [c.id, c.nome]));
    return rows.flatMap((row) => toPrerequisiteEdge(row, targets, nomeById));
  }

  // Domínio de um conceito = média do domínio SM-2 dos flashcards que o definem.
  private async masteryByConcept(
    userId: string,
    conceitoIds: string[],
  ): Promise<Map<string, number>> {
    const cardsByConcept = await this.cardsDefiningConcepts(userId, conceitoIds);
    if (cardsByConcept.size === 0) return new Map();
    const rows = await this.loadLearning(userId, cardsByConcept);
    return this.averageMastery(cardsByConcept, rows);
  }

  private loadLearning(
    userId: string,
    cardsByConcept: Map<string, string[]>,
  ): Promise<LearningRow[]> {
    const cardIds = [...new Set([...cardsByConcept.values()].flat())];
    return this.prisma.aprendizadoFlashcard.findMany({
      where: { usuarioId: userId, flashcardId: { in: cardIds } },
      select: { flashcardId: true, dificuldade: true, intervalo: true, proximaRevisao: true },
    });
  }

  // conceitoId → ids dos flashcards ligados a ele por DEFINE.
  private async cardsDefiningConcepts(
    userId: string,
    conceitoIds: string[],
  ): Promise<Map<string, string[]>> {
    const rows = await this.prisma.conhecimentoAresta.findMany({
      where: {
        tipoRelacao: DEFINES,
        nodeOrigem: { usuarioId: userId, tipoNode: TipoNode.FLASHCARD },
        nodeDestino: { usuarioId: userId, referenciaId: { in: conceitoIds } },
      },
      select: {
        nodeOrigem: { select: { referenciaId: true } },
        nodeDestino: { select: { referenciaId: true } },
      },
    });
    return groupCardsByConcept(rows);
  }

  private averageMastery(
    cardsByConcept: Map<string, string[]>,
    rows: LearningRow[],
  ): Map<string, number> {
    const nowMs = Date.now();
    const byCard = new Map(rows.map((r) => [r.flashcardId, this.calculator.mastery(r, nowMs)]));
    const out = new Map<string, number>();
    for (const [conceitoId, cards] of cardsByConcept) {
      // Card nunca revisado conta como 0: não saber ainda é parte do domínio médio.
      const total = cards.reduce((sum, id) => sum + (byCard.get(id) ?? 0), 0);
      out.set(conceitoId, cards.length ? total / cards.length : 0);
    }
    return out;
  }
}

function remap(
  nodes: { id: string; referenciaId: string }[],
  nomeByRefId: Map<string, string>,
): Map<string, string> {
  const out = new Map<string, string>();
  for (const node of nodes) {
    const nome = nomeByRefId.get(node.referenciaId);
    if (nome) out.set(node.id, nome);
  }
  return out;
}

function toPrerequisiteEdge(
  row: { nodeDestinoId: string | null; nodeOrigem: { referenciaId: string } | null },
  targets: Map<string, string>,
  nomeById: Map<string, string>,
): PrerequisiteEdge[] {
  if (!row.nodeDestinoId || !row.nodeOrigem) return [];
  const conceitoNome = targets.get(row.nodeDestinoId);
  const prereqNome = nomeById.get(row.nodeOrigem.referenciaId);
  if (!conceitoNome || !prereqNome) return [];
  return [{ conceitoNome, prereqNome, prereqConceitoId: row.nodeOrigem.referenciaId }];
}

function groupCardsByConcept(
  rows: {
    nodeOrigem: { referenciaId: string } | null;
    nodeDestino: { referenciaId: string } | null;
  }[],
): Map<string, string[]> {
  const byConcept = new Map<string, string[]>();
  for (const row of rows) {
    if (!row.nodeOrigem || !row.nodeDestino) continue;
    const list = byConcept.get(row.nodeDestino.referenciaId) ?? [];
    list.push(row.nodeOrigem.referenciaId);
    byConcept.set(row.nodeDestino.referenciaId, list);
  }
  return byConcept;
}

function groupByConcept(
  edges: PrerequisiteEdge[],
  mastery: Map<string, number>,
): ConceptPrerequisites {
  const out: ConceptPrerequisites = new Map();
  for (const edge of edges) {
    const list = out.get(edge.conceitoNome) ?? [];
    list.push({ nome: edge.prereqNome, dominio: mastery.get(edge.prereqConceitoId) ?? 0 });
    out.set(edge.conceitoNome, list);
  }
  return out;
}
