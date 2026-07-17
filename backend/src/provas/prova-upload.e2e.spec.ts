import { Test } from '@nestjs/testing';
import { ValidationPipe, type INestApplication } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import request from 'supertest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import { AppModule } from '../app.module';
import { PrismaService } from '../prisma/prisma.service';

// E2E das rotas de prova: app Nest real (auth JWT, ValidationPipe) contra o banco
// de teste. Cobre o parse determinístico (0 token, sem chave de IA) e a ligação
// das questões ao grafo via conceitos confirmados (nós QUESTION + arestas TESTA).

const fixtures = join(__dirname, '../modules/provas/domain/services/__fixtures__');
const enemTxt = readFileSync(join(fixtures, 'enem-4pages.txt'));
const gabaritoTxt = readFileSync(join(fixtures, 'gabarito-enem-d2-cd8.txt'));

const TABLES = [
  '"provas_questoes"',
  '"provas"',
  '"ConhecimentoAresta"',
  '"NodeConhecimento"',
  '"questoes_imagens"',
  '"questoes"',
  '"conceitos"',
  '"grafos_conhecimento"',
  '"usuarios"',
];

describe('provas routes (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let jwt: JwtService;

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({ imports: [AppModule] }).compile();
    app = moduleRef.createNestApplication();
    app.setGlobalPrefix('api');
    app.useGlobalPipes(new ValidationPipe({ transform: true }));
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

  let seq = 0;
  const seedUser = () =>
    prisma.usuario.create({
      data: { nome: 'E2E', email: `p${seq++}-${Date.now()}@test.com`, senhaHash: 'x' },
    });
  const tokenFor = (userId: string) => jwt.signAsync({ sub: userId });

  it('parses a structured ENEM upload deterministically, without footer/header noise', async () => {
    const user = await seedUser();
    const token = await tokenFor(user.id);

    const res = await request(app.getHttpServer())
      .post('/api/provas/parse-upload')
      .set('Authorization', `Bearer ${token}`)
      .attach('prova', enemTxt, 'enem.txt')
      .expect(201);

    expect(res.body.questoes[0].numero).toBe(91);
    // #6: page footers/headers must not leak into any alternative.
    for (const q of res.body.questoes) {
      for (const alt of q.alternativas ?? []) {
        expect(alt.texto).not.toMatch(/\.ind[bd]/);
        expect(alt.texto).not.toContain('CADERNO');
      }
    }
  });

  it('fills gabaritos from a deterministic answer key, without needing an AI key', async () => {
    const user = await seedUser();
    const token = await tokenFor(user.id);

    const res = await request(app.getHttpServer())
      .post('/api/provas/parse-upload')
      .set('Authorization', `Bearer ${token}`)
      .attach('prova', enemTxt, 'enem.txt')
      .attach('gabarito', gabaritoTxt, 'gab.txt')
      .expect(201);

    const q91 = res.body.questoes.find((q: { numero: number }) => q.numero === 91);
    const q93 = res.body.questoes.find((q: { numero: number }) => q.numero === 93);
    expect(q91.gabarito).toBe('E');
    expect(q93.gabarito).toBe('B');
  });

  it('creates a prova and links its question to graph concepts (QUESTION node + TESTA edges)', async () => {
    const user = await seedUser();
    const token = await tokenFor(user.id);
    const grafo = await prisma.grafosConhecimento.create({
      data: { usuarioId: user.id, nome: 'G' },
    });
    const existing = await prisma.conceito.create({
      data: { usuarioId: user.id, nome: 'Esterificação' },
    });

    const res = await request(app.getHttpServer())
      .post('/api/provas/from-parsed')
      .set('Authorization', `Bearer ${token}`)
      .send({
        titulo: 'Prova E2E',
        grafoId: grafo.id,
        questoes: [
          {
            numero: 91,
            enunciado: 'Reação orgânica',
            tipo: 'MULTIPLA_ESCOLHA',
            alternativas: [{ letra: 'A', texto: 'a' }],
            gabarito: 'A',
            explicacao: null,
            conceitos: [
              { nome: 'Esterificação', conceitoId: existing.id },
              { nome: 'Craqueamento de alcanos', conceitoId: null },
            ],
          },
        ],
      })
      .expect(201);
    expect(res.body.provaId).toBeTruthy();

    const conceitos = await prisma.conceito.findMany({ where: { usuarioId: user.id } });
    expect(conceitos.map((c) => c.nome).sort()).toEqual([
      'Craqueamento de alcanos',
      'Esterificação',
    ]);

    const questionNodes = await prisma.nodeConhecimento.findMany({
      where: { tipoNode: 'QUESTION', contidoEm: { some: { grafoId: grafo.id } } },
    });
    expect(questionNodes).toHaveLength(1);

    const edges = await prisma.conhecimentoAresta.findMany({
      where: {
        nodeOrigem: { contidoEm: { some: { grafoId: grafo.id } } },
        nodeDestino: { contidoEm: { some: { grafoId: grafo.id } } },
      },
    });
    expect(edges).toHaveLength(2);
    expect(edges.every((e) => e.tipoRelacao === 'TESTA')).toBe(true);
  });
});
