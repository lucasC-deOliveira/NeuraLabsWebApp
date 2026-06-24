import { Test } from '@nestjs/testing';
import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import { PrismaService } from '../../../../prisma/prisma.service';
import { PrismaGraphQuery } from './prisma-graph.query';

// Integration of the Prisma graph read model against the real DB (neuralabs_test).
// Validates the children count, ordering and parent-name resolution.

const TABLES = ['"grafos_conhecimento"', '"usuarios"'];

describe('Graph query (integration — neuralabs_test)', () => {
  let prisma: PrismaService;
  let query: PrismaGraphQuery;

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({ providers: [PrismaService] }).compile();
    prisma = moduleRef.get(PrismaService);
    await prisma.$connect();
    query = new PrismaGraphQuery(prisma);
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  beforeEach(async () => {
    await prisma.$executeRawUnsafe(`TRUNCATE TABLE ${TABLES.join(',')} RESTART IDENTITY CASCADE`);
  });

  let seq = 0;
  async function seedUser(): Promise<string> {
    const user = await prisma.usuario.create({
      data: { nome: 'Teste', email: `u${seq++}-${Date.now()}@test.com`, senhaHash: 'x' },
    });
    return user.id;
  }

  it('lists the user graphs newest-first with their children count', async () => {
    const userId = await seedUser();
    const parent = await prisma.grafosConhecimento.create({
      data: { usuarioId: userId, nome: 'Parent' },
    });
    await prisma.grafosConhecimento.create({
      data: { usuarioId: userId, nome: 'Child', parentGrafoId: parent.id },
    });

    const list = await query.listForUser(userId);
    expect(list.map((g) => g.nome)).toEqual(['Child', 'Parent']);
    expect(list.find((g) => g.nome === 'Parent')?.filhosCount).toBe(1);
  });

  it('does not list graphs owned by another user', async () => {
    const owner = await seedUser();
    const other = await seedUser();
    await prisma.grafosConhecimento.create({ data: { usuarioId: owner, nome: 'Mine' } });

    expect(await query.listForUser(other)).toHaveLength(0);
  });

  it('resolves the parent name in the info view', async () => {
    const userId = await seedUser();
    const parent = await prisma.grafosConhecimento.create({
      data: { usuarioId: userId, nome: 'Parent' },
    });
    const child = await prisma.grafosConhecimento.create({
      data: {
        usuarioId: userId,
        nome: 'Child',
        parentGrafoId: parent.id,
        tipoRelacaoPai: 'CONTEM',
      },
    });

    const info = await query.findInfo(userId, child.id);
    expect(info).toEqual({
      nome: 'Child',
      descricao: undefined,
      parentGrafoId: parent.id,
      parentNome: 'Parent',
      tipoRelacaoPai: 'CONTEM',
      filhosCount: 0,
    });
  });

  it('returns null for a graph the user does not own', async () => {
    const owner = await seedUser();
    const other = await seedUser();
    const g = await prisma.grafosConhecimento.create({ data: { usuarioId: owner, nome: 'X' } });

    expect(await query.findInfo(other, g.id)).toBeNull();
  });
});
