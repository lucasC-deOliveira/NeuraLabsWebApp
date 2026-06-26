import { Test } from '@nestjs/testing';
import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import { PrismaService } from '../../../../prisma/prisma.service';
import { PrismaVaultImportSessionRepository } from './prisma-vault-import-session.repository';
import { PrismaStudyUnitOfWork } from './prisma-study-unit-of-work';
import { SyncVaultLogUseCase } from '../../application/use-cases/sync-vault-log.use-case';

// Integration of the offline import against the real DB (neuralabs_test).

const TABLES = [
  '"revisoes_flashcard"',
  '"sessoes_estudo"',
  '"AprendizadoFlashcard"',
  '"flashcards"',
  '"conceitos"',
  '"baralhos"',
  '"usuarios"',
];

describe('SyncVaultLogUseCase (integration — neuralabs_test)', () => {
  let prisma: PrismaService;
  let useCase: SyncVaultLogUseCase;

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({ providers: [PrismaService] }).compile();
    prisma = moduleRef.get(PrismaService);
    await prisma.$connect();
    useCase = new SyncVaultLogUseCase(
      new PrismaVaultImportSessionRepository(prisma),
      new PrismaStudyUnitOfWork(prisma),
    );
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  beforeEach(async () => {
    await prisma.$executeRawUnsafe(`TRUNCATE TABLE ${TABLES.join(',')} RESTART IDENTITY CASCADE`);
  });

  let emailSeq = 0;
  const seedUser = () =>
    prisma.usuario.create({
      data: { nome: 'Teste', email: `u${emailSeq++}-${Date.now()}@test.com`, senhaHash: 'x' },
    });
  const seedCard = (usuarioId: string) =>
    prisma.flashcard.create({ data: { usuarioId, pergunta: 'P', resposta: 'R' } });

  it('imports an offline review and schedules the learning state', async () => {
    const user = await seedUser();
    const card = await seedCard(user.id);
    const now = new Date().toISOString();

    const res = await useCase.execute(user.id, [
      {
        startedAt: now,
        endedAt: now,
        revisoes: [{ flashcardId: card.id, grade: 'good', tempoResposta: 1000, revisadoEm: now }],
      },
    ]);

    expect(res.synced).toBe(1);
    const revs = await prisma.revisaoFlashcard.findMany({ where: { flashcardId: card.id } });
    expect(revs).toHaveLength(1);
    const ap = await prisma.aprendizadoFlashcard.findUnique({
      where: { flashcardId_usuarioId: { flashcardId: card.id, usuarioId: user.id } },
    });
    expect(ap?.fase).toBe('LEARN');
  });

  it('ignores reviews for cards the user does not own', async () => {
    const user = await seedUser();
    const now = new Date().toISOString();

    const res = await useCase.execute(user.id, [
      {
        startedAt: now,
        endedAt: now,
        revisoes: [{ flashcardId: 'ghost', grade: 'good', revisadoEm: now }],
      },
    ]);

    expect(res.synced).toBe(1);
    expect(await prisma.revisaoFlashcard.count()).toBe(0);
  });
});
