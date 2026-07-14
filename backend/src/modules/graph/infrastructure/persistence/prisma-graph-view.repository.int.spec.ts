import { Test } from '@nestjs/testing';
import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import { PrismaService } from '../../../../prisma/prisma.service';
import { PrismaGraphViewRepository } from './prisma-graph-view.repository';

// Integration of the graph-view adapter against the real DB (neuralabs_test).
// Validates that the view loads the graph's linked nodes and ownership checks.

const TABLES = ['"NodeConhecimento"', '"assuntos"', '"grafos_conhecimento"', '"usuarios"'];

describe('Graph view (integration — neuralabs_test)', () => {
  let prisma: PrismaService;
  let repo: PrismaGraphViewRepository;

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({ providers: [PrismaService] }).compile();
    prisma = moduleRef.get(PrismaService);
    await prisma.$connect();
    repo = new PrismaGraphViewRepository(prisma);
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  beforeEach(async () => {
    await prisma.$executeRawUnsafe(`TRUNCATE TABLE ${TABLES.join(',')} RESTART IDENTITY CASCADE`);
  });

  let seq = 0;
  async function seedGraph(): Promise<{ userId: string; grafoId: string }> {
    const user = await prisma.usuario.create({
      data: { nome: 'Teste', email: `u${seq++}-${Date.now()}@test.com`, senhaHash: 'x' },
    });
    const grafo = await prisma.grafosConhecimento.create({
      data: { usuarioId: user.id, nome: 'G' },
    });
    return { userId: user.id, grafoId: grafo.id };
  }

  it('loads the view with the graph linked nodes', async () => {
    const { userId, grafoId } = await seedGraph();
    const assunto = await prisma.assunto.create({ data: { usuarioId: userId, nome: 'A' } });
    await prisma.nodeConhecimento.create({
      data: { usuarioId: userId, grafoId, tipoNode: 'ASSUNTO', referenciaId: assunto.id },
    });

    const view = await repo.loadView(userId, grafoId);
    expect(view.nodes.some((n) => n.type === 'ASSUNTO')).toBe(true);
  });

  it('reports ownership via exists', async () => {
    const { userId, grafoId } = await seedGraph();
    const other = await seedGraph();
    expect(await repo.exists(grafoId, userId)).toBe(true);
    expect(await repo.exists(grafoId, other.userId)).toBe(false);
  });
});
