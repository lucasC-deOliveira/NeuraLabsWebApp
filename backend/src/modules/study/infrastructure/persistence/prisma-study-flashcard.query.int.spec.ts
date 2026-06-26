import { Test } from '@nestjs/testing';
import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import { PrismaService } from '../../../../prisma/prisma.service';
import { PrismaStudyFlashcardQuery } from './prisma-study-flashcard.query';
import { PrismaStudySessionRepository } from './prisma-study-session.repository';
import { StartSingleCardStudyUseCase } from '../../application/use-cases/start-single-card-study.use-case';

// Integration of the single-card read model against the real DB (neuralabs_test),
// plus StartSingleCardStudyUseCase opening a session only when the card is due.

const TABLES = [
  '"revisoes_flashcard"',
  '"sessoes_estudo"',
  '"AprendizadoFlashcard"',
  '"flashcards"',
  '"conceitos"',
  '"baralhos"',
  '"usuarios"',
];

describe('Single-card study (integration — neuralabs_test)', () => {
  let prisma: PrismaService;
  let query: PrismaStudyFlashcardQuery;
  let startSingleCard: StartSingleCardStudyUseCase;

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({ providers: [PrismaService] }).compile();
    prisma = moduleRef.get(PrismaService);
    await prisma.$connect();
    query = new PrismaStudyFlashcardQuery(prisma);
    startSingleCard = new StartSingleCardStudyUseCase(
      query,
      new PrismaStudySessionRepository(prisma),
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

  it('returns null for a card the user does not own', async () => {
    const user = await seedUser();
    expect(await query.findForStudy(user.id, 'nope')).toBeNull();
  });

  it('treats a brand-new card (no learning state) as due', async () => {
    const user = await seedUser();
    const card = await seedCard(user.id);
    const view = await query.findForStudy(user.id, card.id);
    expect(view).toMatchObject({ id: card.id, due: true, fase: 'LEARN', proximaRevisao: null });
  });

  it('treats a card scheduled for the future as not due', async () => {
    const user = await seedUser();
    const card = await seedCard(user.id);
    await prisma.aprendizadoFlashcard.create({
      data: {
        flashcardId: card.id,
        usuarioId: user.id,
        fase: 'REVIEW',
        proximaRevisao: new Date(Date.now() + 86_400_000),
      },
    });
    const view = await query.findForStudy(user.id, card.id);
    expect(view?.due).toBe(false);
  });

  it('startSingleCard opens a session for a due card', async () => {
    const user = await seedUser();
    const card = await seedCard(user.id);
    const res = await startSingleCard.execute(user.id, card.id);
    expect(res?.due).toBe(true);
    expect(res?.sessionId).toBeTruthy();
    const sess = await prisma.sessaoEstudo.findUnique({ where: { id: res!.sessionId! } });
    expect(sess).not.toBeNull();
  });
});
