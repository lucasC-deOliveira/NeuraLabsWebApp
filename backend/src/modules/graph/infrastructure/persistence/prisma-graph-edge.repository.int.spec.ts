import { Test } from '@nestjs/testing';
import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import { PrismaService } from '../../../../prisma/prisma.service';
import { PrismaGraphEdgeRepository } from './prisma-graph-edge.repository';
import { CreateEdgeUseCase } from '../../application/use-cases/create-edge.use-case';
import { DeleteEdgeUseCase } from '../../application/use-cases/delete-edge.use-case';
import { DuplicateEdgeError } from '../../domain/errors';

// Integration of the Prisma edge adapter against the real DB (neuralabs_test),
// driven by the Create/Delete edge use-cases. Validates the TipoRelacao enum
// mapping and the uniqueness rule.

const TABLES = [
  '"ConhecimentoAresta"',
  '"NodeConhecimento"',
  '"grafos_conhecimento"',
  '"usuarios"',
];

describe('Graph edges (integration — neuralabs_test)', () => {
  let prisma: PrismaService;
  let createEdge: CreateEdgeUseCase;
  let deleteEdge: DeleteEdgeUseCase;

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({ providers: [PrismaService] }).compile();
    prisma = moduleRef.get(PrismaService);
    await prisma.$connect();
    const repo = new PrismaGraphEdgeRepository(prisma);
    createEdge = new CreateEdgeUseCase(repo);
    deleteEdge = new DeleteEdgeUseCase(repo);
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  beforeEach(async () => {
    await prisma.$executeRawUnsafe(`TRUNCATE TABLE ${TABLES.join(',')} RESTART IDENTITY CASCADE`);
  });

  let seq = 0;
  async function seedGraphWithTwoNodes(): Promise<{ userId: string; grafoId: string }> {
    const user = await prisma.usuario.create({
      data: { nome: 'Teste', email: `u${seq++}-${Date.now()}@test.com`, senhaHash: 'x' },
    });
    const grafo = await prisma.grafosConhecimento.create({
      data: { usuarioId: user.id, nome: 'G' },
    });
    await prisma.nodeConhecimento.create({
      data: { usuarioId: user.id, grafoId: grafo.id, tipoNode: 'NOTA', referenciaId: 'nota-ref' },
    });
    await prisma.nodeConhecimento.create({
      data: {
        usuarioId: user.id,
        grafoId: grafo.id,
        tipoNode: 'CONCEITO',
        referenciaId: 'conceito-ref',
      },
    });
    return { userId: user.id, grafoId: grafo.id };
  }

  const define = (userId: string, grafoId: string) => ({
    userId,
    grafoId,
    sourceNodeId: 'nota-ref',
    targetNodeId: 'conceito-ref',
    tipoRelacao: 'DEFINE',
  });

  it('creates an edge and persists it', async () => {
    const { userId, grafoId } = await seedGraphWithTwoNodes();
    const res = await createEdge.execute(define(userId, grafoId));
    expect(res.edgeId).toBeTruthy();
    expect(await prisma.conhecimentoAresta.count({ where: { grafoId } })).toBe(1);
  });

  it('rejects a duplicate edge', async () => {
    const { userId, grafoId } = await seedGraphWithTwoNodes();
    await createEdge.execute(define(userId, grafoId));
    await expect(createEdge.execute(define(userId, grafoId))).rejects.toBeInstanceOf(
      DuplicateEdgeError,
    );
  });

  it('deletes an owned edge', async () => {
    const { userId, grafoId } = await seedGraphWithTwoNodes();
    const { edgeId } = await createEdge.execute(define(userId, grafoId));
    await deleteEdge.execute(userId, grafoId, edgeId);
    expect(await prisma.conhecimentoAresta.count({ where: { grafoId } })).toBe(0);
  });
});
