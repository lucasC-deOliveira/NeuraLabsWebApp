import { Test } from '@nestjs/testing';
import { type INestApplication } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import request from 'supertest';
import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import { AppModule } from '../app.module';
import { PrismaService } from '../prisma/prisma.service';

// E2E da rota POST /api/study/review: app Nest real (auth JWT, filtro de erros
// de domínio) contra o banco de teste (neuralabs_test).

const TABLES = [
  '"revisoes_flashcard"',
  '"sessoes_estudo"',
  '"AprendizadoFlashcard"',
  '"flashcards"',
  '"conceitos"',
  '"baralhos"',
  '"usuarios"',
];

describe('POST /api/study/review (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let jwt: JwtService;

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({ imports: [AppModule] }).compile();
    app = moduleRef.createNestApplication();
    app.setGlobalPrefix('api');
    await app.init();
    prisma = app.get(PrismaService);
    jwt = app.get(JwtService);
  });

  afterAll(async () => {
    await app.close();
  });

  beforeEach(async () => {
    await prisma.$executeRawUnsafe(`TRUNCATE TABLE ${TABLES.join(',')} RESTART IDENTITY CASCADE`);
  });

  let emailSeq = 0;
  const seedUser = () =>
    prisma.usuario.create({
      data: { nome: 'E2E', email: `e2e${emailSeq++}-${Date.now()}@test.com`, senhaHash: 'x' },
    });
  const tokenFor = (userId: string) => jwt.signAsync({ sub: userId });

  it('rejects an unauthenticated request with 401', async () => {
    await request(app.getHttpServer())
      .post('/api/study/review')
      .send({ flashcardId: 'x', grade: 'good' })
      .expect(401);
  });

  it('records a review and reschedules the card (good → LEARN step 1)', async () => {
    const user = await seedUser();
    const card = await prisma.flashcard.create({
      data: { usuarioId: user.id, pergunta: 'P', resposta: 'R' },
    });
    const sess = await prisma.sessaoEstudo.create({ data: { usuarioId: user.id } });
    const token = await tokenFor(user.id);

    const res = await request(app.getHttpServer())
      .post('/api/study/review')
      .set('Authorization', `Bearer ${token}`)
      .send({ flashcardId: card.id, grade: 'good', sessaoId: sess.id })
      .expect(201);
    expect(res.body).toEqual({ success: true });

    const ap = await prisma.aprendizadoFlashcard.findUnique({
      where: { flashcardId_usuarioId: { flashcardId: card.id, usuarioId: user.id } },
    });
    expect(ap?.fase).toBe('LEARN');
    expect(ap?.learningStep).toBe(1);
  });

  it('maps NoActiveSession to 400 with a user-facing Portuguese message', async () => {
    const user = await seedUser();
    const card = await prisma.flashcard.create({
      data: { usuarioId: user.id, pergunta: 'P', resposta: 'R' },
    });
    const token = await tokenFor(user.id);

    const res = await request(app.getHttpServer())
      .post('/api/study/review')
      .set('Authorization', `Bearer ${token}`)
      .send({ flashcardId: card.id, grade: 'good' })
      .expect(400);
    expect(res.body.message).toBe('Nenhuma sessão de estudo ativa.');
  });
});
