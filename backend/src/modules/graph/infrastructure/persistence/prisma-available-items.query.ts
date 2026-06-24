import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../../prisma/prisma.service';
import type {
  AvailableItemsQuery,
  AvailableItemsView,
} from '../../domain/ports/available-items-query';
import {
  flashcardHierarchy,
  preview,
  type AvailableItem,
  type FlashcardConcept,
} from '../../domain/services/available-item';

type FlashcardRow = {
  id: string;
  pergunta: string;
  conceitoId: string | null;
  conceito: FlashcardConcept | null;
};
type NotaRow = { id: string; conteudo: string };
type QuestaoRow = {
  id: string;
  enunciado: string;
  conceitoId: string | null;
  conceito: { nome: string } | null;
};
type ProvaRow = {
  id: string;
  titulo: string;
  descricao: string | null;
  _count: { questoes: number };
};

@Injectable()
export class PrismaAvailableItemsQuery implements AvailableItemsQuery {
  constructor(private readonly prisma: PrismaService) {}

  async listForGraph(userId: string, grafoId: string): Promise<AvailableItemsView> {
    const inGraph = await this.refsInGraph(userId, grafoId);
    const [flashcards, notas, questoes, provas] = await Promise.all([
      this.fetchFlashcards(userId, inGraph.FLASHCARD ?? []),
      this.fetchNotas(userId, inGraph.NOTA ?? []),
      this.fetchQuestoes(userId, inGraph.QUESTION ?? []),
      this.fetchProvas(userId, inGraph.PROVA ?? []),
    ]);
    return {
      flashcards: flashcards.map(toFlashcardItem),
      notas: notas.map(toNotaItem),
      questoes: questoes.map(toQuestaoItem),
      provas: provas.map(toProvaItem),
    };
  }

  // Map of tipoNode -> referenciaIds already linked into the graph (to exclude).
  private async refsInGraph(userId: string, grafoId: string): Promise<Record<string, string[]>> {
    const existing = await this.prisma.nodeConhecimento.findMany({
      where: { grafoId, usuarioId: userId },
      select: { referenciaId: true, tipoNode: true },
    });
    const inGraph: Record<string, string[]> = {};
    for (const n of existing) (inGraph[n.tipoNode] ??= []).push(n.referenciaId);
    return inGraph;
  }

  private fetchFlashcards(userId: string, exclude: string[]): Promise<FlashcardRow[]> {
    return this.prisma.flashcard.findMany({
      where: { usuarioId: userId, id: { notIn: exclude } },
      include: { conceito: { include: { topico: { include: { assunto: true } } } } },
      orderBy: { dataCriacao: 'desc' },
      take: 50,
    });
  }

  private fetchNotas(userId: string, exclude: string[]): Promise<NotaRow[]> {
    return this.prisma.nota.findMany({
      where: { usuarioId: userId, id: { notIn: exclude } },
      orderBy: { dataCriacao: 'desc' },
      take: 50,
    });
  }

  private fetchQuestoes(userId: string, exclude: string[]): Promise<QuestaoRow[]> {
    return this.prisma.questao.findMany({
      where: { usuarioId: userId, id: { notIn: exclude } },
      include: { conceito: { select: { id: true, nome: true } } },
      orderBy: { dataCriacao: 'desc' },
      take: 50,
    });
  }

  private fetchProvas(userId: string, exclude: string[]): Promise<ProvaRow[]> {
    return this.prisma.prova.findMany({
      where: { usuarioId: userId, id: { notIn: exclude } },
      include: { _count: { select: { questoes: true } } },
      orderBy: { dataCriacao: 'desc' },
      take: 50,
    });
  }
}

const toFlashcardItem = (fc: FlashcardRow): AvailableItem => ({
  id: fc.id,
  label: preview(fc.pergunta),
  fullText: fc.pergunta,
  tipo: 'FLASHCARD',
  conceitoId: fc.conceitoId,
  hierarquia: flashcardHierarchy(fc.conceito),
});

const toNotaItem = (n: NotaRow): AvailableItem => ({
  id: n.id,
  label: preview(n.conteudo),
  fullText: n.conteudo,
  tipo: 'NOTA',
  hierarquia: 'Nota direta',
});

const toQuestaoItem = (q: QuestaoRow): AvailableItem => ({
  id: q.id,
  label: preview(q.enunciado),
  fullText: q.enunciado,
  tipo: 'QUESTION',
  conceitoId: q.conceitoId ?? null,
  hierarquia: q.conceito ? q.conceito.nome : 'Sem conceito',
});

const toProvaItem = (p: ProvaRow): AvailableItem => ({
  id: p.id,
  label: p.titulo,
  fullText: p.titulo + (p.descricao ? ` — ${p.descricao}` : ''),
  tipo: 'PROVA',
  hierarquia: `${p._count.questoes} questões`,
});
