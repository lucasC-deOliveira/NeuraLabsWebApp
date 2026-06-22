import { Test } from '@nestjs/testing';
import {
  describe, it, expect, beforeAll, afterAll, beforeEach,
} from 'vitest';
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
    await prisma.$executeRawUnsafe(
      `TRUNCATE TABLE ${TABLES.join(',')} RESTART IDENTITY CASCADE`,
    );
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

  it('submitReview: cria revisão e aprendizado (carta nova, good → LEARN passo 1)', async () => {
    const user = await seedUser();
    const card = await seedCard(user.id);
    const sess = await prisma.sessaoEstudo.create({ data: { usuarioId: user.id } });

    const res = await service.submitReview(user.id, {
      flashcardId: card.id, respostaUsuario: 'R', grade: 'good', sessaoId: sess.id,
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

  it('submitReview: again numa carta em REVIEW manda para RELEARN', async () => {
    const user = await seedUser();
    const card = await seedCard(user.id);
    await prisma.sessaoEstudo.create({ data: { usuarioId: user.id } });
    await prisma.aprendizadoFlashcard.create({
      data: {
        flashcardId: card.id, usuarioId: user.id, fase: 'REVIEW',
        intervalo: 10, fatorEase: 2.5, dificuldade: 3, learningStep: 0,
      },
    });

    await service.submitReview(user.id, { flashcardId: card.id, respostaUsuario: '', grade: 'again' });

    const ap = await aprendizadoDe(card.id, user.id);
    expect(ap?.fase).toBe('RELEARN');
    expect(ap?.fatorEase).toBeCloseTo(2.3, 5); // 2.5 - 0.2
    expect(ap?.intervalo).toBe(2); // round(10 * 0.2)
  });

  it('submitReview: sem sessão ativa lança erro', async () => {
    const user = await seedUser();
    const card = await seedCard(user.id);
    await expect(
      service.submitReview(user.id, { flashcardId: card.id, respostaUsuario: '', grade: 'good' }),
    ).rejects.toThrow();
  });

  it('startSession: cria sessão e retorna cartas novas', async () => {
    const user = await seedUser();
    await seedCard(user.id);

    const res = await service.startSession(user.id);
    expect(res.sessionId).toBeTruthy();
    expect(res.cards).toHaveLength(1);

    const sess = await prisma.sessaoEstudo.findUnique({ where: { id: res.sessionId } });
    expect(sess).not.toBeNull();
  });

  it('finalizeSession: remove sessão sem revisões', async () => {
    const user = await seedUser();
    const sess = await prisma.sessaoEstudo.create({ data: { usuarioId: user.id } });

    const out = await service.finalizeSession(user.id, sess.id);
    expect(out.success).toBe(true);
    expect(await prisma.sessaoEstudo.findUnique({ where: { id: sess.id } })).toBeNull();
  });

  it('syncVaultLog: importa revisões offline e agenda o aprendizado', async () => {
    const user = await seedUser();
    const card = await seedCard(user.id);
    const now = new Date().toISOString();

    const res = await service.syncVaultLog(user.id, [
      {
        id: 's1', startedAt: now, endedAt: now, baralhoId: null,
        revisoes: [{ flashcardId: card.id, grade: 'good', tempoResposta: 1000, revisadoEm: now }],
      },
    ]);

    expect(res.synced).toBe(1);
    const ap = await aprendizadoDe(card.id, user.id);
    expect(ap).not.toBeNull();
    expect(ap?.fase).toBe('LEARN');
  });
});
