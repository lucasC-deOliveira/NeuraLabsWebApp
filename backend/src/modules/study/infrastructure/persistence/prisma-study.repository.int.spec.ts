import { Test } from '@nestjs/testing';
import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import { PrismaService } from '../../../../prisma/prisma.service';
import { PrismaStudyRepository } from './prisma-study.repository';
import { SystemClock } from '../clock/system-clock';
import { SubmitReviewUseCase } from '../../application/use-cases/submit-review.use-case';
import { NoActiveSessionError } from '../../domain/errors';

// Integração do adapter Prisma contra o banco real (neuralabs_test), exercitado
// pelo SubmitReviewUseCase. Substitui as caracterizações que travavam
// StudyService.submitReview: mesmo comportamento (revisão + agendamento SM-2),
// agora no seam hexagonal (use-case → port → adapter Prisma).

const TABLES = [
  '"revisoes_flashcard"',
  '"sessoes_estudo"',
  '"AprendizadoFlashcard"',
  '"flashcards"',
  '"conceitos"',
  '"baralhos"',
  '"usuarios"',
];

describe('PrismaStudyRepository + SubmitReviewUseCase (integração — neuralabs_test)', () => {
  let prisma: PrismaService;
  let useCase: SubmitReviewUseCase;

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({ providers: [PrismaService] }).compile();
    prisma = moduleRef.get(PrismaService);
    await prisma.$connect();
    useCase = new SubmitReviewUseCase(new PrismaStudyRepository(prisma), new SystemClock());
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

  it('cria revisão e aprendizado (carta nova, good → LEARN passo 1)', async () => {
    const user = await seedUser();
    const card = await seedCard(user.id);
    const sess = await prisma.sessaoEstudo.create({ data: { usuarioId: user.id } });

    const res = await useCase.execute({
      userId: user.id,
      flashcardId: card.id,
      respostaUsuario: 'R',
      grade: 'good',
      sessaoId: sess.id,
    });
    expect(res.success).toBe(true);

    const revs = await prisma.revisaoFlashcard.findMany({ where: { flashcardId: card.id } });
    expect(revs).toHaveLength(1);
    expect(revs[0].acertou).toBe(true);
    expect(revs[0].nivelConfianca).toBe(4); // good → 4

    const ap = await aprendizadoDe(card.id, user.id);
    expect(ap?.fase).toBe('LEARN');
    expect(ap?.learningStep).toBe(1);
    expect(ap?.fatorEase).toBe(2.5);
    expect(ap!.proximaRevisao.getTime()).toBeGreaterThan(Date.now());
  });

  it('again numa carta em REVIEW manda para RELEARN', async () => {
    const user = await seedUser();
    const card = await seedCard(user.id);
    await prisma.sessaoEstudo.create({ data: { usuarioId: user.id } });
    await prisma.aprendizadoFlashcard.create({
      data: {
        flashcardId: card.id,
        usuarioId: user.id,
        fase: 'REVIEW',
        intervalo: 10,
        fatorEase: 2.5,
        dificuldade: 3,
        learningStep: 0,
      },
    });

    await useCase.execute({
      userId: user.id,
      flashcardId: card.id,
      respostaUsuario: '',
      grade: 'again',
    });

    const ap = await aprendizadoDe(card.id, user.id);
    expect(ap?.fase).toBe('RELEARN');
    expect(ap?.fatorEase).toBeCloseTo(2.3, 5); // 2.5 - 0.2
    expect(ap?.intervalo).toBe(2); // round(10 * 0.2)
  });

  it('sem sessão ativa lança NoActiveSessionError', async () => {
    const user = await seedUser();
    const card = await seedCard(user.id);
    await expect(
      useCase.execute({
        userId: user.id,
        flashcardId: card.id,
        respostaUsuario: '',
        grade: 'good',
      }),
    ).rejects.toBeInstanceOf(NoActiveSessionError);
  });
});
