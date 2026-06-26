import { Test } from '@nestjs/testing';
import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import { PrismaService } from '../../../../prisma/prisma.service';
import { PrismaStudyCardQuery } from './prisma-study-card.query';
import { PrismaStudySessionRepository } from './prisma-study-session.repository';
import { StartSessionUseCase } from '../../application/use-cases/start-session.use-case';

// Integration of the read-model query + session repository against the real DB
// (neuralabs_test), driven by StartSessionUseCase.

const TABLES = [
  '"revisoes_flashcard"',
  '"sessoes_estudo"',
  '"AprendizadoFlashcard"',
  '"flashcards"',
  '"conceitos"',
  '"baralhos"',
  '"usuarios"',
];

describe('StartSessionUseCase (integration — neuralabs_test)', () => {
  let prisma: PrismaService;
  let useCase: StartSessionUseCase;

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({ providers: [PrismaService] }).compile();
    prisma = moduleRef.get(PrismaService);
    await prisma.$connect();
    useCase = new StartSessionUseCase(
      new PrismaStudySessionRepository(prisma),
      new PrismaStudyCardQuery(prisma),
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

  it('opens a session and returns the new card', async () => {
    const user = await seedUser();
    await prisma.flashcard.create({ data: { usuarioId: user.id, pergunta: 'P', resposta: 'R' } });

    const res = await useCase.execute(user.id);

    expect(res.sessionId).toBeTruthy();
    expect(res.cards).toHaveLength(1);
    const sess = await prisma.sessaoEstudo.findUnique({ where: { id: res.sessionId } });
    expect(sess).not.toBeNull();
  });

  it('includes due cards and excludes cards scheduled for the future', async () => {
    const user = await seedUser();
    const due = await prisma.flashcard.create({
      data: { usuarioId: user.id, pergunta: 'due', resposta: 'R' },
    });
    const future = await prisma.flashcard.create({
      data: { usuarioId: user.id, pergunta: 'future', resposta: 'R' },
    });
    const past = new Date(Date.now() - 86_400_000);
    const ahead = new Date(Date.now() + 86_400_000);
    await prisma.aprendizadoFlashcard.create({
      data: { flashcardId: due.id, usuarioId: user.id, fase: 'REVIEW', proximaRevisao: past },
    });
    await prisma.aprendizadoFlashcard.create({
      data: { flashcardId: future.id, usuarioId: user.id, fase: 'REVIEW', proximaRevisao: ahead },
    });

    const res = await useCase.execute(user.id);

    const ids = res.cards.map((c) => c.id);
    expect(ids).toContain(due.id);
    expect(ids).not.toContain(future.id);
  });
});
