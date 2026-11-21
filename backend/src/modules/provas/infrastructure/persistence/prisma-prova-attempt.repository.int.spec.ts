import { randomUUID } from 'node:crypto';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { PrismaService } from '../../../../prisma/prisma.service';
import { InvalidVaultAttemptQuestionError, ProvaForbiddenError } from '../../domain/errors';
import type { ProvaAttemptInput } from '../../domain/ports/prova-attempt-repository';
import { PrismaProvaAttemptRepository } from './prisma-prova-attempt.repository';

describe('PrismaProvaAttemptRepository vault synchronization', () => {
  const prisma = new PrismaService();
  const repo = new PrismaProvaAttemptRepository(prisma);
  const accounts: string[] = [];

  beforeAll(async () => prisma.$connect());
  afterAll(async () => {
    await prisma.usuario.deleteMany({ where: { id: { in: accounts } } });
    await prisma.$disconnect();
  });

  async function createAccount(): Promise<string> {
    const account = await prisma.usuario.create({
      data: { nome: 'Exam Sync', email: `exam-${randomUUID()}@test.example`, senhaHash: 'test' },
    });
    accounts.push(account.id);
    return account.id;
  }

  async function createAttempt(): Promise<{ userId: string; attempt: ProvaAttemptInput }> {
    const userId = await createAccount();
    const question = await prisma.questao.create({
      data: { usuarioId: userId, tipo: 'VERDADEIRO_FALSO', enunciado: 'Prompt', gabarito: 'V' },
    });
    const exam = await prisma.prova.create({
      data: { usuarioId: userId, titulo: 'Exam', questoes: { create: { questaoId: question.id } } },
    });
    return {
      userId,
      attempt: {
        provaId: exam.id,
        acertos: 1,
        total: 1,
        tempoTotalMs: 2000,
        localAttemptId: randomUUID(),
        completedAt: '2026-05-01T13:30:00.000Z',
        respostas: [
          { questaoId: question.id, respostaEscolhida: 'V', acertou: true, tempoRespostaMs: 1500 },
        ],
      },
    };
  }

  it('reuses the same attempt after concurrent uploads and preserves the offline completion time', async () => {
    const { userId, attempt } = await createAttempt();
    const results = await Promise.all([repo.save(userId, attempt), repo.save(userId, attempt)]);
    expect(results[0].id).toBe(results[1].id);
    expect(results.filter(({ alreadyRecorded }) => alreadyRecorded)).toHaveLength(1);
    const saved = await prisma.tentativaProva.findMany({
      where: { usuarioId: userId, provaId: attempt.provaId },
      include: { respostas: true },
    });
    expect(saved).toHaveLength(1);
    expect(saved[0].dataFim.toISOString()).toBe(attempt.completedAt);
    expect(saved[0].respostas).toHaveLength(1);
  });

  it('rejects uploads from another account or with answers outside the exam', async () => {
    const { userId, attempt } = await createAttempt();
    await expect(repo.save(await createAccount(), attempt)).rejects.toThrow(ProvaForbiddenError);
    const respostas = [{ ...attempt.respostas[0], questaoId: 'outside-exam' }];
    await expect(repo.save(userId, { ...attempt, respostas })).rejects.toThrow(
      InvalidVaultAttemptQuestionError,
    );
  });

  it('returns completed attempts only for the owning account and the graph that contains the exam', async () => {
    const { userId, attempt } = await createAttempt();
    const graph = await prisma.grafosConhecimento.create({
      data: { usuarioId: userId, nome: 'History' },
    });
    await prisma.nodeConhecimento.create({
      data: {
        usuarioId: userId,
        tipoNode: 'PROVA',
        referenciaId: attempt.provaId,
        contidoEm: { create: { grafoId: graph.id } },
      },
    });
    const saved = await repo.save(userId, attempt);
    const rows = await repo.listForGraph(userId, graph.id, '');
    expect(rows).toMatchObject([
      { id: saved.id, completedAt: attempt.completedAt, respostas: attempt.respostas },
    ]);
    await expect(repo.listForGraph(userId, graph.id, saved.id)).resolves.toEqual([]);
    await expect(repo.listForGraph(userId, 'other-graph', '')).resolves.toEqual([]);
    await expect(repo.listForGraph(await createAccount(), graph.id, '')).resolves.toEqual([]);
  });
});
