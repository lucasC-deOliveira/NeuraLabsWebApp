import { Test } from '@nestjs/testing';
import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import { PrismaService } from '../../../../prisma/prisma.service';
import { PrismaGraphExportRepository } from './prisma-graph-export.repository';

// Integration of the export read adapter against the real DB (neuralabs_test).

const TABLES = ['"NodeConhecimento"', '"grafos_conhecimento"', '"usuarios"'];

describe('Graph export (integration — neuralabs_test)', () => {
  let prisma: PrismaService;
  let repo: PrismaGraphExportRepository;

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({ providers: [PrismaService] }).compile();
    prisma = moduleRef.get(PrismaService);
    await prisma.$connect();
    repo = new PrismaGraphExportRepository(prisma);
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
      data: { usuarioId: user.id, nome: 'Bio' },
    });
    return { userId: user.id, grafoId: grafo.id };
  }

  it('returns the graph header and its node rows', async () => {
    const { userId, grafoId } = await seedGraph();
    const node = await prisma.nodeConhecimento.create({
      data: { usuarioId: userId, grafoId, tipoNode: 'CONCEITO', referenciaId: 'c1', posicaoX: 5 },
    });
    await prisma.grafoNode.create({ data: { grafoId, nodeId: node.id, posicaoX: 5 } });

    expect(await repo.findGraph(grafoId, userId)).toEqual({ id: grafoId, nome: 'Bio' });
    const rows = await repo.listNodes(grafoId, userId);
    // posicaoY is unset on insert, so it falls back to the schema @default(0.0),
    // matching the convention asserted in the sibling position int specs.
    expect(rows).toEqual([
      { tipoNode: 'CONCEITO', referenciaId: 'c1', posicaoX: 5, posicaoY: 0, nivelDominio: 0 },
    ]);
  });

  it('returns null for a graph the user does not own', async () => {
    const { grafoId } = await seedGraph();
    const other = await seedGraph();
    expect(await repo.findGraph(grafoId, other.userId)).toBeNull();
  });
});
