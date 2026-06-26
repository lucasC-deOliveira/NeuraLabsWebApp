import { Test } from '@nestjs/testing';
import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import { PrismaService } from '../../../../prisma/prisma.service';
import { PrismaStudySessionLifecycle } from './prisma-study-session-lifecycle';
import { EndSessionUseCase } from '../../application/use-cases/end-session.use-case';
import { FinalizeSessionUseCase } from '../../application/use-cases/finalize-session.use-case';

// Integration of the session-lifecycle adapter against the real DB
// (neuralabs_test), driven by the End/Finalize use-cases.

const TABLES = [
  '"revisoes_flashcard"',
  '"sessoes_estudo"',
  '"AprendizadoFlashcard"',
  '"flashcards"',
  '"conceitos"',
  '"baralhos"',
  '"usuarios"',
];

describe('Session lifecycle (integration — neuralabs_test)', () => {
  let prisma: PrismaService;
  let endSession: EndSessionUseCase;
  let finalizeSession: FinalizeSessionUseCase;

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({ providers: [PrismaService] }).compile();
    prisma = moduleRef.get(PrismaService);
    await prisma.$connect();
    const lifecycle = new PrismaStudySessionLifecycle(prisma);
    endSession = new EndSessionUseCase(lifecycle);
    finalizeSession = new FinalizeSessionUseCase(lifecycle);
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

  it('endSession marks the session ended', async () => {
    const user = await seedUser();
    const sess = await prisma.sessaoEstudo.create({ data: { usuarioId: user.id } });

    const res = await endSession.execute(user.id, sess.id);

    expect(res.success).toBe(true);
    const after = await prisma.sessaoEstudo.findUnique({ where: { id: sess.id } });
    expect(after?.dataFim).not.toBeNull();
  });

  it('finalizeSession deletes a session with no reviews', async () => {
    const user = await seedUser();
    const sess = await prisma.sessaoEstudo.create({ data: { usuarioId: user.id } });

    const res = await finalizeSession.execute(user.id, sess.id);

    expect(res.success).toBe(true);
    expect(await prisma.sessaoEstudo.findUnique({ where: { id: sess.id } })).toBeNull();
  });

  it('finalizeSession ends (keeps) a session that has reviews', async () => {
    const user = await seedUser();
    const card = await prisma.flashcard.create({
      data: { usuarioId: user.id, pergunta: 'P', resposta: 'R' },
    });
    const sess = await prisma.sessaoEstudo.create({ data: { usuarioId: user.id } });
    await prisma.revisaoFlashcard.create({
      data: {
        flashcardId: card.id,
        sessaoId: sess.id,
        respostaUsuario: '',
        acertou: true,
        nivelConfianca: 4,
      },
    });

    const res = await finalizeSession.execute(user.id, sess.id);

    expect(res.success).toBe(true);
    const after = await prisma.sessaoEstudo.findUnique({ where: { id: sess.id } });
    expect(after).not.toBeNull();
    expect(after?.dataFim).not.toBeNull();
  });

  it('finalizeSession returns success=false for a missing session', async () => {
    const user = await seedUser();
    const res = await finalizeSession.execute(user.id, 'does-not-exist');
    expect(res.success).toBe(false);
  });
});
