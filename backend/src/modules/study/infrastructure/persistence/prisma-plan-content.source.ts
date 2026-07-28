import { Injectable } from '@nestjs/common';
import { TipoNode } from '@prisma/client';
import { PrismaService } from '../../../../prisma/prisma.service';
import type { PlanContentSource } from '../../domain/ports/plan-content-source';
import {
  NEW_CARD_SCHEDULE,
  NO_IMPORTANCE,
  type StudyCardView,
} from '../../domain/ports/study-card-query';
import type { PlanQuestion } from '../../domain/ports/roadmap-questions-query';

type Fc = { id: string; pergunta: string; resposta: string };
type Learn = {
  fase: string;
  learningStep: number;
  intervalo: number;
  fatorEase: number;
  dificuldade: number;
  proximaRevisao: Date;
  ultimaRevisao: Date;
  flashcard: Fc;
};

const toNewView = (f: Fc): StudyCardView => ({
  ...f,
  conceito: null,
  ...NEW_CARD_SCHEDULE,
  ...NO_IMPORTANCE,
});

const toDueView = (r: Learn): StudyCardView => ({
  id: r.flashcard.id,
  pergunta: r.flashcard.pergunta,
  resposta: r.flashcard.resposta,
  conceito: null, // o conceito vem do grafo depois (enrichConcepts)
  ...NO_IMPORTANCE,
  fase: r.fase,
  learningStep: r.learningStep,
  intervalo: r.intervalo,
  fatorEase: r.fatorEase,
  dificuldade: r.dificuldade,
  proximaRevisao: r.proximaRevisao.toISOString(),
  ultimaRevisao: r.ultimaRevisao.toISOString(),
});

const DUE_SELECT = {
  fase: true,
  learningStep: true,
  intervalo: true,
  fatorEase: true,
  dificuldade: true,
  proximaRevisao: true,
  ultimaRevisao: true,
  flashcard: { select: { id: true, pergunta: true, resposta: true } },
} as const;

type QuestaoRow = {
  id: string;
  enunciado: string;
  alternativas: unknown;
  gabarito: string;
  explicacao: string | null;
};

const toProvaQuestion = (r: QuestaoRow, names: Map<string, string>): PlanQuestion => ({
  id: r.id,
  enunciado: r.enunciado,
  alternativas: (r.alternativas ?? null) as PlanQuestion['alternativas'],
  gabarito: r.gabarito,
  explicacao: r.explicacao,
  conceito: names.get(r.id) ?? null,
  conceitoId: null,
});

// Primeiro conceito ligado a cada questão (questaoId → conceitoId), a partir das arestas.
function firstConceptByQuestion(
  edges: { nodeOrigemId: string | null; nodeDestino: { referenciaId: string } | null }[],
  nodeToQ: Map<string, string>,
): Map<string, string> {
  const m = new Map<string, string>();
  for (const e of edges) {
    const q = e.nodeOrigemId ? nodeToQ.get(e.nodeOrigemId) : undefined;
    if (q && e.nodeDestino && !m.has(q)) m.set(q, e.nodeDestino.referenciaId);
  }
  return m;
}

/**
 * Conteúdo curado do plano: cards dos baralhos e questões das provas escolhidas. O
 * conceito dos cards vem do grafo depois (enrichConcepts); as questões já trazem o seu.
 */
@Injectable()
export class PrismaPlanContentSource implements PlanContentSource {
  constructor(private readonly prisma: PrismaService) {}

  async dueCardsFromBaralhos(userId: string, baralhoIds: string[]): Promise<StudyCardView[]> {
    if (baralhoIds.length === 0) return [];
    const rows = await this.prisma.aprendizadoFlashcard.findMany({
      where: {
        usuarioId: userId,
        proximaRevisao: { lte: new Date() },
        flashcard: { baralhos: { some: { id: { in: baralhoIds } } } },
      },
      select: DUE_SELECT,
      orderBy: [{ fase: 'asc' }, { proximaRevisao: 'asc' }],
    });
    return rows.map(toDueView);
  }

  async newCardsFromBaralhos(
    userId: string,
    baralhoIds: string[],
    limit: number,
  ): Promise<StudyCardView[]> {
    if (baralhoIds.length === 0 || limit <= 0) return [];
    const rows = await this.prisma.flashcard.findMany({
      where: {
        usuarioId: userId,
        baralhos: { some: { id: { in: baralhoIds } } },
        aprendizado: { none: {} },
      },
      select: { id: true, pergunta: true, resposta: true },
      take: limit,
    });
    return rows.map(toNewView);
  }

  async questionsFromProvas(
    userId: string,
    provaIds: string[],
    limit: number,
  ): Promise<PlanQuestion[]> {
    if (provaIds.length === 0 || limit <= 0) return [];
    const rows = await this.prisma.questao.findMany({
      where: { usuarioId: userId, provasQuestao: { some: { provaId: { in: provaIds } } } },
      select: { id: true, enunciado: true, alternativas: true, gabarito: true, explicacao: true },
    });
    return this.buildQuestions(userId, rows, limit);
  }

  // Tira as já acertadas, corta no limite e resolve o conceito de cada questão.
  private async buildQuestions(
    userId: string,
    rows: QuestaoRow[],
    limit: number,
  ): Promise<PlanQuestion[]> {
    const ids = rows.map((r) => r.id);
    const correct = await this.correctIds(userId, ids);
    const chosen = rows.filter((r) => !correct.has(r.id)).slice(0, limit);
    const names = await this.questionConcepts(
      userId,
      chosen.map((r) => r.id),
    );
    return chosen.map((r) => toProvaQuestion(r, names));
  }

  async excludedEntityIds(
    userId: string,
    conceitoIds: string[],
  ): Promise<{ flashcards: Set<string>; questions: Set<string> }> {
    const empty = { flashcards: new Set<string>(), questions: new Set<string>() };
    if (conceitoIds.length === 0) return empty;
    const nodes = await this.prisma.nodeConhecimento.findMany({
      where: { usuarioId: userId, tipoNode: TipoNode.CONCEITO, referenciaId: { in: conceitoIds } },
      select: { id: true },
    });
    if (nodes.length === 0) return empty;
    const edges = await this.prisma.conhecimentoAresta.findMany({
      where: {
        nodeDestinoId: { in: nodes.map((n) => n.id) },
        nodeOrigem: { tipoNode: { in: [TipoNode.FLASHCARD, TipoNode.QUESTION] } },
      },
      select: { nodeOrigem: { select: { tipoNode: true, referenciaId: true } } },
    });
    return this.splitByType(edges);
  }

  private splitByType(
    edges: { nodeOrigem: { tipoNode: TipoNode; referenciaId: string } | null }[],
  ): { flashcards: Set<string>; questions: Set<string> } {
    const flashcards = new Set<string>();
    const questions = new Set<string>();
    for (const e of edges) {
      if (e.nodeOrigem?.tipoNode === TipoNode.FLASHCARD) flashcards.add(e.nodeOrigem.referenciaId);
      else if (e.nodeOrigem?.tipoNode === TipoNode.QUESTION)
        questions.add(e.nodeOrigem.referenciaId);
    }
    return { flashcards, questions };
  }

  // Questão → nome do conceito, pelas arestas QUESTION→CONCEITO do grafo.
  private async questionConcepts(userId: string, ids: string[]): Promise<Map<string, string>> {
    if (ids.length === 0) return new Map();
    const qnodes = await this.prisma.nodeConhecimento.findMany({
      where: { usuarioId: userId, tipoNode: TipoNode.QUESTION, referenciaId: { in: ids } },
      select: { id: true, referenciaId: true },
    });
    if (qnodes.length === 0) return new Map();
    const nodeToQ = new Map(qnodes.map((n) => [n.id, n.referenciaId]));
    const edges = await this.prisma.conhecimentoAresta.findMany({
      where: {
        nodeOrigemId: { in: [...nodeToQ.keys()] },
        nodeDestino: { tipoNode: TipoNode.CONCEITO },
      },
      select: { nodeOrigemId: true, nodeDestino: { select: { referenciaId: true } } },
    });
    return this.resolveNames(userId, nodeToQ, edges);
  }

  private async resolveNames(
    userId: string,
    nodeToQ: Map<string, string>,
    edges: { nodeOrigemId: string | null; nodeDestino: { referenciaId: string } | null }[],
  ): Promise<Map<string, string>> {
    const qToConcept = firstConceptByQuestion(edges, nodeToQ);
    const conceitos = await this.prisma.conceito.findMany({
      where: { usuarioId: userId, id: { in: [...new Set(qToConcept.values())] } },
      select: { id: true, nome: true },
    });
    const nameById = new Map(conceitos.map((c) => [c.id, c.nome]));
    const out = new Map<string, string>();
    for (const [q, cid] of qToConcept) {
      const nome = nameById.get(cid);
      if (nome) out.set(q, nome);
    }
    return out;
  }

  private async correctIds(userId: string, ids: string[]): Promise<Set<string>> {
    if (ids.length === 0) return new Set();
    const rows = await this.prisma.respostaQuestao.findMany({
      where: { acertou: true, questaoId: { in: ids }, tentativa: { usuarioId: userId } },
      select: { questaoId: true },
    });
    return new Set(rows.map((r) => r.questaoId));
  }
}
