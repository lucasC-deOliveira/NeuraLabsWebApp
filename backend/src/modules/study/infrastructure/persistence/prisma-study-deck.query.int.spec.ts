import { Test } from '@nestjs/testing';
import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import { PrismaService } from '../../../../prisma/prisma.service';
import { PrismaStudyDeckQuery } from './prisma-study-deck.query';
import { PrismaCardImportanceQuery } from '../../../curriculum/infrastructure/persistence/prisma-card-importance.query';
import { PrismaConceitoImportanceRepository } from '../../../curriculum/infrastructure/persistence/prisma-conceito-importance.repository';
import { PrismaStudySessionRepository } from './prisma-study-session.repository';
import { StartDeckStudyUseCase } from '../../application/use-cases/start-deck-study.use-case';

// Integration of the deck read model against the real DB (neuralabs_test),
// plus StartDeckStudyUseCase opening a session for the deck.

const TABLES = [
  '"revisoes_flashcard"',
  '"sessoes_estudo"',
  '"AprendizadoFlashcard"',
  '"flashcards"',
  '"conceitos"',
  '"baralhos"',
  '"usuarios"',
];

describe('Deck study (integration — neuralabs_test)', () => {
  let prisma: PrismaService;
  let query: PrismaStudyDeckQuery;
  let startDeck: StartDeckStudyUseCase;

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({ providers: [PrismaService] }).compile();
    prisma = moduleRef.get(PrismaService);
    await prisma.$connect();
    query = new PrismaStudyDeckQuery(
      prisma,
      new PrismaCardImportanceQuery(prisma, new PrismaConceitoImportanceRepository(prisma)),
    );
    startDeck = new StartDeckStudyUseCase(query, new PrismaStudySessionRepository(prisma));
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

  it('returns null for a deck the user does not own', async () => {
    const user = await seedUser();
    expect(await query.findDeckForStudy(user.id, 'nope')).toBeNull();
  });

  it('returns only due cards but counts the whole deck', async () => {
    const user = await seedUser();
    const deck = await prisma.baralho.create({ data: { usuarioId: user.id, titulo: 'Sabedoria' } });
    const dueCard = await prisma.flashcard.create({
      data: {
        usuarioId: user.id,
        baralhos: { connect: { id: deck.id } },
        pergunta: 'due',
        resposta: 'R',
      },
    });
    const futureCard = await prisma.flashcard.create({
      data: {
        usuarioId: user.id,
        baralhos: { connect: { id: deck.id } },
        pergunta: 'future',
        resposta: 'R',
      },
    });
    await prisma.aprendizadoFlashcard.create({
      data: {
        flashcardId: futureCard.id,
        usuarioId: user.id,
        fase: 'REVIEW',
        proximaRevisao: new Date(Date.now() + 86_400_000),
      },
    });

    const view = await query.findDeckForStudy(user.id, deck.id);

    expect(view?.titulo).toBe('Sabedoria');
    expect(view?.totalNoDeck).toBe(2);
    expect(view?.cards.map((c) => c.id)).toEqual([dueCard.id]);
  });

  it('startDeck opens a session for an existing deck', async () => {
    const user = await seedUser();
    const deck = await prisma.baralho.create({ data: { usuarioId: user.id, titulo: 'Vazio' } });

    const res = await startDeck.execute(user.id, deck.id);

    expect(res?.sessionId).toBeTruthy();
    const sess = await prisma.sessaoEstudo.findUnique({ where: { id: res!.sessionId } });
    expect(sess).not.toBeNull();
  });
});
