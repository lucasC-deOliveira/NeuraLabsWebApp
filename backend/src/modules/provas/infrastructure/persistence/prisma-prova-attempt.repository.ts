import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { createHash } from 'node:crypto';
import { VAULT_EXAM_HISTORY_PAGE_SIZE } from '../../../../../../contracts/provas';
import { PrismaService } from '../../../../prisma/prisma.service';
import {
  assertOwner,
  InvalidVaultAttemptQuestionError,
  VaultAttemptExamMismatchError,
} from '../../domain/errors';
import type {
  ProvaAttemptInput,
  ProvaAttemptRepository,
  RecordedProvaAttempt,
  ServerExamAttempt,
} from '../../domain/ports/prova-attempt-repository';

// Persiste a tentativa e suas respostas numa escrita aninhada (uma transação).
@Injectable()
export class PrismaProvaAttemptRepository implements ProvaAttemptRepository {
  constructor(private readonly prisma: PrismaService) {}

  async listForGraph(userId: string, graphId: string, after: string): Promise<ServerExamAttempt[]> {
    const examIds = await this.vaultGraphExamIds(userId, graphId);
    const attempts = await this.prisma.tentativaProva.findMany({
      where: { usuarioId: userId, provaId: { in: examIds }, id: { gt: after } },
      take: VAULT_EXAM_HISTORY_PAGE_SIZE,
      orderBy: { id: 'asc' },
      include: { respostas: { orderBy: { id: 'asc' } } },
    });
    return attempts.map(toServerExamAttempt);
  }

  private async vaultGraphExamIds(userId: string, graphId: string): Promise<string[]> {
    const exams = await this.prisma.nodeConhecimento.findMany({
      where: {
        usuarioId: userId,
        tipoNode: 'PROVA',
        contidoEm: { some: { grafoId: graphId, grafo: { usuarioId: userId } } },
      },
      select: { referenciaId: true },
    });
    return exams.map(({ referenciaId }) => referenciaId);
  }

  async save(userId: string, attempt: ProvaAttemptInput): Promise<RecordedProvaAttempt> {
    if (!attempt.localAttemptId || !attempt.completedAt) {
      return this.prisma.tentativaProva.create({
        data: attemptData(userId, attempt),
        select: { id: true },
      });
    }
    const id = vaultAttemptId(userId, attempt.localAttemptId);
    const existing = await this.findVaultAttempt(id, userId, attempt.provaId);
    if (existing) return { ...existing, alreadyRecorded: true };
    await this.verifyVaultQuestions(userId, attempt);
    const dataFim = new Date(attempt.completedAt);
    return this.createVaultAttempt(id, {
      ...attemptData(userId, attempt),
      id,
      dataInicio: new Date(dataFim.getTime() - attempt.tempoTotalMs),
      dataFim,
    });
  }

  private async findVaultAttempt(
    id: string,
    userId: string,
    examId: string,
  ): Promise<{ id: string } | null> {
    const existing = await this.prisma.tentativaProva.findUnique({ where: { id } });
    if (!existing) return null;
    assertOwner(existing, userId);
    if (existing.provaId !== examId) throw new VaultAttemptExamMismatchError(examId);
    return { id: existing.id };
  }

  private async verifyVaultQuestions(userId: string, attempt: ProvaAttemptInput): Promise<void> {
    const exam = await this.prisma.prova.findUnique({
      where: { id: attempt.provaId },
      select: { usuarioId: true, questoes: { select: { questaoId: true } } },
    });
    assertOwner(exam, userId);
    const questionIds = new Set(exam.questoes.map(({ questaoId }) => questaoId));
    const invalid = attempt.respostas.find(({ questaoId }) => !questionIds.has(questaoId));
    if (invalid) throw new InvalidVaultAttemptQuestionError(invalid.questaoId);
  }

  private async createVaultAttempt(
    id: string,
    data: Prisma.TentativaProvaUncheckedCreateInput,
  ): Promise<RecordedProvaAttempt> {
    try {
      return await this.prisma.tentativaProva.create({ data, select: { id: true } });
    } catch (error) {
      if (!(error instanceof Prisma.PrismaClientKnownRequestError) || error.code !== 'P2002')
        throw error;
      const existing = await this.findVaultAttempt(id, data.usuarioId, data.provaId);
      if (!existing) throw error;
      return { ...existing, alreadyRecorded: true };
    }
  }
}

function toServerExamAttempt(
  attempt: Prisma.TentativaProvaGetPayload<{ include: { respostas: true } }>,
): ServerExamAttempt {
  return {
    id: attempt.id,
    provaId: attempt.provaId,
    completedAt: attempt.dataFim.toISOString(),
    acertos: attempt.acertos,
    total: attempt.total,
    tempoTotalMs: attempt.tempoTotalMs,
    respostas: attempt.respostas.map(
      ({ questaoId, respostaEscolhida, acertou, tempoRespostaMs }) => ({
        questaoId,
        respostaEscolhida,
        acertou,
        tempoRespostaMs,
      }),
    ),
  };
}

function vaultAttemptId(userId: string, localAttemptId: string): string {
  const digest = createHash('sha256')
    .update(JSON.stringify([userId, localAttemptId]))
    .digest('hex');
  return `vault-${digest}`;
}

function attemptData(
  userId: string,
  attempt: ProvaAttemptInput,
): Prisma.TentativaProvaUncheckedCreateInput {
  return {
    usuarioId: userId,
    provaId: attempt.provaId,
    acertos: attempt.acertos,
    total: attempt.total,
    tempoTotalMs: attempt.tempoTotalMs,
    respostas: { create: attempt.respostas },
  };
}
