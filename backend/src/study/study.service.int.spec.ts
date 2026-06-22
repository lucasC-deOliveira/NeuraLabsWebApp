import { Test } from '@nestjs/testing';
import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import { PrismaService } from '../prisma/prisma.service';
import { StudyService } from './study.service';

// Testes de CARACTERIZAÇÃO de integração — exercitam StudyService contra o
// banco real (neuralabs_test) para travar o comportamento atual da camada de
// persistência ANTES da refatoração para hexagonal. Não mudam comportamento.

const TABLES = [
  '"revisoes_flashcard"',
  '"sessoes_estudo"',
  '"AprendizadoFlashcard"',
  '"flashcards"',
  '"conceitos"',
  '"baralhos"',
  '"usuarios"',
];

describe('StudyService (integração — neuralabs_test)', () => {
  let prisma: PrismaService;
  let service: StudyService;

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      providers: [StudyService, PrismaService],
    }).compile();
    prisma = moduleRef.get(PrismaService);
    service = moduleRef.get(StudyService);
    await prisma.$connect();
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
  const aprendizadoDe = (flashcardId: string, usuarioId: string) =>
    prisma.aprendizadoFlashcard.findUnique({
      where: { flashcardId_usuarioId: { flashcardId, usuarioId } },
    });

  // submitReview migrou para SubmitReviewUseCase e startSession para
  // StartSessionUseCase — ver os *.int.spec.ts em src/modules/study/.

  it('syncVaultLog: importa revisões offline e agenda o aprendizado', async () => {
    const user = await seedUser();
    const card = await seedCard(user.id);
    const now = new Date().toISOString();

    const res = await service.syncVaultLog(user.id, [
      {
        id: 's1',
        startedAt: now,
        endedAt: now,
        baralhoId: null,
        revisoes: [{ flashcardId: card.id, grade: 'good', tempoResposta: 1000, revisadoEm: now }],
      },
    ]);

    expect(res.synced).toBe(1);
    const ap = await aprendizadoDe(card.id, user.id);
    expect(ap).not.toBeNull();
    expect(ap?.fase).toBe('LEARN');
  });
});
