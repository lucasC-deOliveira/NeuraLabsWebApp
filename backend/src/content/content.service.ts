import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { buildRulePreview } from './flashcard-gen';

@Injectable()
export class ContentService {
  constructor(private readonly prisma: PrismaService) {}

  // Flashcards novos não precisam de seed — aparecem como "new" na próxima sessão.
  // O registro AprendizadoFlashcard é criado automaticamente na primeira revisão.

  // Preview de flashcards (regras) a partir de uma nota.
  async previewFlashcardsFromNota(userId: string, notaId: string) {
    const nota = await this.prisma.nota.findFirst({ where: { id: notaId, usuarioId: userId } });
    if (!nota) throw new NotFoundException('Nota não encontrada');
    const allConcepts = await this.prisma.conceito.findMany({ where: { usuarioId: userId }, select: { id: true, nome: true } });
    return buildRulePreview(nota.conteudo, allConcepts);
  }

  // Salva previews selecionados como flashcards (com SRS). Vínculo ao grafo é feito pela UI por-grafo.
  async saveFlashcardPreviewsFromNota(userId: string, _notaId: string, data: Array<{ pergunta: string; resposta: string; conceitoId: string }>) {
    await this.prisma.$transaction(async (tx) => {
      for (const fc of data) {
        const created = await tx.flashcard.create({
          data: { pergunta: fc.pergunta, resposta: fc.resposta, conceitoId: fc.conceitoId, usuarioId: userId },
        });
      }
    });
    return { count: data.length };
  }

  // ---- Flashcards (CRUD) ----
  async createFlashcard(userId: string, data: { pergunta: string; resposta: string; conceitoId?: string | null; tipo?: string | null }) {
    const fc = await this.prisma.$transaction(async (tx) => {
      const created = await tx.flashcard.create({
        data: { pergunta: data.pergunta, resposta: data.resposta, conceitoId: data.conceitoId ?? null, usuarioId: userId, tipo: (data.tipo as any) ?? null },
      });
      return created;
    });
    return { flashcardId: fc.id };
  }

  async updateFlashcard(userId: string, id: string, data: { pergunta?: string; resposta?: string; tipo?: string | null }) {
    await this.prisma.flashcard.updateMany({
      where: { id, usuarioId: userId },
      data: {
        ...(data.pergunta !== undefined && { pergunta: data.pergunta }),
        ...(data.resposta !== undefined && { resposta: data.resposta }),
        ...(data.tipo !== undefined && { tipo: (data.tipo as any) ?? null }),
      },
    });
    return { success: true };
  }

  async deleteFlashcard(userId: string, id: string) {
    await this.prisma.flashcard.deleteMany({ where: { id, usuarioId: userId } });
    return { success: true };
  }

  async deleteAllFlashcards(userId: string) {
    const flashcards = await this.prisma.flashcard.findMany({ where: { usuarioId: userId }, select: { id: true } });
    const count = flashcards.length;
    await this.prisma.$transaction(async (tx) => {
      for (const fc of flashcards) {
        const node = await tx.nodeConhecimento.findFirst({ where: { tipoNode: 'FLASHCARD', referenciaId: fc.id } });
        if (node) {
          await tx.conhecimentoAresta.deleteMany({ where: { OR: [{ nodeOrigemId: node.id }, { nodeDestinoId: node.id }] } });
          await tx.nodeConhecimento.delete({ where: { id: node.id } });
        }
      }
      await tx.flashcard.deleteMany({ where: { usuarioId: userId } });
    });
    return { count };
  }

  // ---- Hierarquia (criação) ----
  async createAssunto(userId: string, nome: string) {
    const created = await this.prisma.assunto.create({ data: { nome, usuarioId: userId } });
    return { id: created.id, nome: created.nome };
  }

  async createTopico(userId: string, nome: string, assuntoId: string) {
    const assunto = await this.prisma.assunto.findFirst({ where: { id: assuntoId, usuarioId: userId } });
    if (!assunto) throw new Error('Assunto não encontrado');
    const created = await this.prisma.topico.create({ data: { nome, assuntoId, usuarioId: userId } });
    return { id: created.id, nome: created.nome };
  }

  // conceito sob um tópico (cria assunto/tópico antes via createAssunto/createTopico quando necessário)
  async createFullConcept(userId: string, input: { nome: string; assuntoId: string; topicoId: string }) {
    const topico = await this.prisma.topico.findFirst({
      where: { id: input.topicoId, assunto: { usuarioId: userId } },
    });
    if (!topico) throw new Error('Tópico não encontrado');
    const created = await this.prisma.conceito.create({ data: { nome: input.nome, topicoId: input.topicoId, usuarioId: userId } });
    return { id: created.id, nome: created.nome };
  }

  // árvore: Assunto → (PERTENCE_A) → Tópico → (FUNDAMENTA) → Conceito
  async getHierarquiaConceitos(userId: string) {
    const userAssuntos = await this.prisma.assunto.findMany({
      where: { usuarioId: userId },
      include: { topicos: { include: { conceitos: true } } },
    });

    return userAssuntos.map((assunto) => ({
      id: assunto.id,
      nome: assunto.nome,
      relAssuntoTopico: [
        {
          tipoRelacao: 'PERTENCE_A',
          topicos: assunto.topicos.map((t) => ({
            id: t.id,
            nome: t.nome,
            assuntoId: assunto.id,
            relacoesTopicoConceito: t.conceitos.length
              ? [
                  {
                    tipoRelacao: 'FUNDAMENTA',
                    conceitos: t.conceitos.map((c) => ({
                      id: c.id,
                      nome: c.nome,
                      topicoId: t.id,
                      topicoNome: t.nome,
                      assuntoId: assunto.id,
                      assuntoNome: assunto.nome,
                    })),
                  },
                ]
              : [],
          })),
        },
      ],
    }));
  }

  // hierarquia completa: assunto → tópico → conceito (dropdown de conceito)
  async getConceptHierarchy(userId: string) {
    const assuntos = await this.prisma.assunto.findMany({
      where: { usuarioId: userId },
      include: { topicos: { include: { conceitos: { select: { id: true, nome: true } } } } },
      orderBy: { nome: 'asc' },
    });
    return assuntos.map((a) => ({
      id: a.id,
      nome: a.nome,
      topicos: a.topicos.map((t) => ({ id: t.id, nome: t.nome, conceitos: t.conceitos })),
    }));
  }

  // hierarquia (filtros): assuntos → tópicos
  async getFlashcardFilterData(userId: string) {
    const assuntos = await this.prisma.assunto.findMany({
      where: { usuarioId: userId },
      include: { topicos: { select: { id: true, nome: true, assuntoId: true } } },
    });
    return assuntos.map((a) => ({ id: a.id, nome: a.nome, topicos: a.topicos.map((t) => ({ id: t.id, nome: t.nome, assuntoId: t.assuntoId ?? a.id })) }));
  }

  // Assuntos com seus tópicos (a home usa topicos.length)
  async listSubjects(userId: string) {
    const assuntos = await this.prisma.assunto.findMany({
      where: { usuarioId: userId },
      include: { topicos: { select: { id: true, nome: true } } },
      orderBy: { nome: 'asc' },
    });
    return assuntos.map((a) => ({ id: a.id, nome: a.nome, descricao: a.descricao, topicos: a.topicos }));
  }

  // Flashcards do usuário com hierarquia e o agendamento (SRS)
  async getFlashcards(userId: string, opts?: { conceptId?: string; topicId?: string }) {
    const where: Record<string, unknown> = { usuarioId: userId };
    if (opts?.conceptId) where.conceitoId = opts.conceptId;
    if (opts?.topicId) where.conceito = { topicoId: opts.topicId };

    const records = await this.prisma.flashcard.findMany({
      where,
      include: {
        conceito: { include: { topico: { include: { assunto: true } } } },
        aprendizado: { take: 1, orderBy: { ultimaRevisao: 'desc' } },
      },
      orderBy: { dataCriacao: 'desc' },
    });

    return records.map((fc) => ({
      id: fc.id,
      tipo: fc.tipo ?? null,
      pergunta: fc.pergunta,
      resposta: fc.resposta,
      conceito: fc.conceito?.nome ?? '',
      topico: fc.conceito?.topico?.nome ?? '',
      topicoId: fc.conceito?.topico?.id ?? '',
      assunto: fc.conceito?.topico?.assunto?.nome ?? '',
      assuntoId: fc.conceito?.topico?.assunto?.id ?? '',
      dataCriacao: fc.dataCriacao,
      spacedRepetition: fc.aprendizado[0]
        ? {
            dificuldade: fc.aprendizado[0].dificuldade,
            intervalo: fc.aprendizado[0].intervalo,
            proximaRevisao: fc.aprendizado[0].proximaRevisao,
            ultimaRevisao: fc.aprendizado[0].ultimaRevisao,
            estagioAprendizado: fc.aprendizado[0].estagioAprendizado,
          }
        : null,
    }));
  }

  // Histórico das sessões de estudo (resumo)
  async getStudyHistory(userId: string) {
    const sessions = await this.prisma.sessaoEstudo.findMany({
      where: { usuarioId: userId },
      include: { _count: { select: { revisoes: true } }, revisoes: { select: { acertou: true, nivelConfianca: true } } },
      orderBy: { dataInicio: 'desc' },
      take: 20,
    });
    return sessions.map((s) => {
      const reviews = s.revisoes;
      const correctCount = reviews.filter((r) => r.acertou).length;
      const avgConfidence = reviews.length ? reviews.reduce((sum, r) => sum + r.nivelConfianca, 0) / reviews.length : 0;
      return {
        id: s.id,
        dataInicio: s.dataInicio,
        dataFim: s.dataFim,
        totalReviews: s._count.revisoes,
        correctCount,
        incorrectCount: reviews.length - correctCount,
        avgConfidence,
      };
    });
  }
}
