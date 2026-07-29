import { Injectable } from '@nestjs/common';
import { TipoNode } from '@prisma/client';
import { PrismaService } from '../../../../prisma/prisma.service';
import type {
  PlanQuestion,
  RoadmapQuestionsQuery,
} from '../../domain/ports/roadmap-questions-query';
import { orderPlanQuestions } from '../../domain/services/plan-questions';
import { dedupeConceptOrder } from '../../domain/services/roadmap-concept-order';

type QuestaoRow = {
  id: string;
  enunciado: string;
  alternativas: unknown;
  gabarito: string;
  explicacao: string | null;
};

type Ranked = QuestaoRow & { conceitoId: string | null };

function toPlanQuestion(r: Ranked, names: Map<string, string>): PlanQuestion {
  return {
    id: r.id,
    enunciado: r.enunciado,
    alternativas: (r.alternativas ?? null) as PlanQuestion['alternativas'],
    gabarito: r.gabarito,
    explicacao: r.explicacao,
    conceito: r.conceitoId ? (names.get(r.conceitoId) ?? null) : null,
    conceitoId: r.conceitoId,
  };
}

type EdgeRow = { nodeDestinoId: string | null; nodeOrigem: { referenciaId: string } | null };

// Registra o PRIMEIRO conceito ligado a cada questão (ignora arestas seguintes).
function addFirstConcept(
  out: Map<string, string>,
  e: EdgeRow,
  conceptNodes: Map<string, string>,
): void {
  const conceitoId = e.nodeDestinoId ? conceptNodes.get(e.nodeDestinoId) : undefined;
  if (e.nodeOrigem && conceitoId && !out.has(e.nodeOrigem.referenciaId)) {
    out.set(e.nodeOrigem.referenciaId, conceitoId);
  }
}

function firstQuestionConcepts(
  edges: EdgeRow[],
  conceptNodes: Map<string, string>,
): Map<string, string> {
  const out = new Map<string, string>();
  for (const e of edges) addFirstConcept(out, e, conceptNodes);
  return out;
}

/**
 * Questões dos conceitos do roadmap para a prática do plano. Ligam ao conceito pelas
 * arestas QUESTION→CONCEITO do grafo (o `conceitoId` relacional é nulo no acervo real);
 * as já acertadas ficam de fora e o resto sai na ordem do roadmap.
 * @example query.findByRoadmap('u1', 'g1', 'prova', 5)
 */
@Injectable()
export class PrismaRoadmapQuestionsQuery implements RoadmapQuestionsQuery {
  constructor(private readonly prisma: PrismaService) {}

  async findByRoadmap(
    userId: string,
    grafoIds: string[],
    modo: string,
    limit: number,
  ): Promise<PlanQuestion[]> {
    if (limit <= 0) return [];
    const order = await this.roadmapConceptOrder(userId, grafoIds, modo);
    if (order.length === 0) return [];
    const conceptNodes = await this.conceptNodes(userId, order);
    const qToConcept = await this.questionConcepts(grafoIds, conceptNodes);
    if (qToConcept.size === 0) return [];
    const rows = await this.fetchQuestions(userId, [...qToConcept.keys()]);
    return this.rankAndBuild(userId, rows, order, qToConcept, limit);
  }

  private async rankAndBuild(
    userId: string,
    rows: QuestaoRow[],
    order: string[],
    qToConcept: Map<string, string>,
    limit: number,
  ): Promise<PlanQuestion[]> {
    const enriched = rows.map((r) => ({ ...r, conceitoId: qToConcept.get(r.id) ?? null }));
    const correct = await this.correctIds(
      userId,
      rows.map((r) => r.id),
    );
    const names = await this.conceptNames(userId, [...new Set(qToConcept.values())]);
    return orderPlanQuestions(enriched, order, correct)
      .slice(0, limit)
      .map((r) => toPlanQuestion(r, names));
  }

  private async roadmapConceptOrder(
    userId: string,
    grafoIds: string[],
    modo: string,
  ): Promise<string[]> {
    if (grafoIds.length === 0) return [];
    const rows = await this.prisma.roadmapTrilha.findMany({
      where: { usuarioId: userId, grafoId: { in: grafoIds }, modo },
      select: { itens: true },
    });
    return dedupeConceptOrder(rows);
  }

  // conceptNodeId → conceitoId, para os conceitos da trilha.
  private async conceptNodes(userId: string, conceitoIds: string[]): Promise<Map<string, string>> {
    const nodes = await this.prisma.nodeConhecimento.findMany({
      where: { usuarioId: userId, tipoNode: TipoNode.CONCEITO, referenciaId: { in: conceitoIds } },
      select: { id: true, referenciaId: true },
    });
    return new Map(nodes.map((n) => [n.id, n.referenciaId]));
  }

  // questaoId → conceitoId, pelas arestas QUESTION→CONCEITO (primeiro conceito ligado).
  private async questionConcepts(
    grafoIds: string[],
    conceptNodes: Map<string, string>,
  ): Promise<Map<string, string>> {
    const edges = await this.prisma.conhecimentoAresta.findMany({
      where: {
        nodeDestinoId: { in: [...conceptNodes.keys()] },
        nodeOrigem: {
          tipoNode: TipoNode.QUESTION,
          contidoEm: { some: { grafoId: { in: grafoIds } } },
        },
      },
      select: { nodeDestinoId: true, nodeOrigem: { select: { referenciaId: true } } },
    });
    return firstQuestionConcepts(edges, conceptNodes);
  }

  private fetchQuestions(userId: string, ids: string[]): Promise<QuestaoRow[]> {
    return this.prisma.questao.findMany({
      where: { usuarioId: userId, id: { in: ids } },
      select: { id: true, enunciado: true, alternativas: true, gabarito: true, explicacao: true },
    });
  }

  private async conceptNames(userId: string, conceitoIds: string[]): Promise<Map<string, string>> {
    if (conceitoIds.length === 0) return new Map();
    const rows = await this.prisma.conceito.findMany({
      where: { usuarioId: userId, id: { in: conceitoIds } },
      select: { id: true, nome: true },
    });
    return new Map(rows.map((c) => [c.id, c.nome]));
  }

  // Questões que o usuário já acertou em alguma tentativa (para deixá-las de fora).
  private async correctIds(userId: string, ids: string[]): Promise<Set<string>> {
    if (ids.length === 0) return new Set();
    const rows = await this.prisma.respostaQuestao.findMany({
      where: { acertou: true, questaoId: { in: ids }, tentativa: { usuarioId: userId } },
      select: { questaoId: true },
    });
    return new Set(rows.map((r) => r.questaoId));
  }
}
