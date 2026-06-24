import { Test } from '@nestjs/testing';
import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import { PrismaService } from '../../../../prisma/prisma.service';
import { PrismaCreateSubgraphRepository } from './prisma-create-subgraph.repository';
import { CreateSubgraphUseCase } from '../../application/use-cases/create-subgraph.use-case';
import { ParentGraphNotFoundError } from '../../domain/errors';

// Integration of the subgraph-creation adapter against the real DB
// (neuralabs_test), driven by the CreateSubgraph use-case.

const TABLES = ['"NodeConhecimento"', '"grafos_conhecimento"', '"usuarios"'];

describe('Subgraph creation (integration — neuralabs_test)', () => {
  let prisma: PrismaService;
  let createSubgraph: CreateSubgraphUseCase;

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({ providers: [PrismaService] }).compile();
    prisma = moduleRef.get(PrismaService);
    await prisma.$connect();
    createSubgraph = new CreateSubgraphUseCase(new PrismaCreateSubgraphRepository(prisma));
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
      data: { usuarioId: user.id, nome: 'Parent' },
    });
    return { userId: user.id, grafoId: grafo.id };
  }

  it('creates a child graph linked to the parent with a GRAFO_REF node', async () => {
    const { userId, grafoId } = await seedGraph();
    const { grafoId: childId } = await createSubgraph.execute(userId, grafoId, {
      nome: 'Sub',
      tipoRelacao: 'APROFUNDA',
    });

    const child = await prisma.grafosConhecimento.findUnique({ where: { id: childId } });
    expect(child).toMatchObject({ parentGrafoId: grafoId, tipoRelacaoPai: 'APROFUNDA' });
    const ref = await prisma.nodeConhecimento.findFirst({
      where: { grafoId, tipoNode: 'GRAFO_REF', referenciaId: childId },
    });
    expect(ref).not.toBeNull();
  });

  it('throws when the parent is not owned', async () => {
    const { grafoId } = await seedGraph();
    const intruder = await seedGraph();
    await expect(
      createSubgraph.execute(intruder.userId, grafoId, { nome: 'Sub', tipoRelacao: 'APROFUNDA' }),
    ).rejects.toBeInstanceOf(ParentGraphNotFoundError);
  });
});
