import { Test } from '@nestjs/testing';
import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import { PrismaService } from '../../../../prisma/prisma.service';
import { PrismaGraphDeletionRepository } from './prisma-graph-deletion.repository';
import { DeleteGraphUseCase } from '../../application/use-cases/delete-graph.use-case';
import { DeleteNodeUseCase } from '../../application/use-cases/delete-node.use-case';

// Integration of the deletion adapter against the real DB (neuralabs_test),
// driven by the Delete graph/node use-cases. Validates entity removal and the
// shared-entity rule.

const TABLES = [
  '"ConhecimentoAresta"',
  '"NodeConhecimento"',
  '"conceitos"',
  '"topicos"',
  '"assuntos"',
  '"grafos_conhecimento"',
  '"usuarios"',
];

describe('Graph deletion (integration — neuralabs_test)', () => {
  let prisma: PrismaService;
  let deleteGraph: DeleteGraphUseCase;
  let deleteNode: DeleteNodeUseCase;

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({ providers: [PrismaService] }).compile();
    prisma = moduleRef.get(PrismaService);
    await prisma.$connect();
    const repo = new PrismaGraphDeletionRepository(prisma);
    deleteGraph = new DeleteGraphUseCase(repo);
    deleteNode = new DeleteNodeUseCase(repo);
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

  async function linkConcept(userId: string, grafoId: string, nome: string): Promise<string> {
    const conceito = await prisma.conceito.create({ data: { usuarioId: userId, nome } });
    await prisma.nodeConhecimento.create({
      data: { usuarioId: userId, grafoId, tipoNode: 'CONCEITO', referenciaId: conceito.id },
    });
    return conceito.id;
  }

  it('deletes a node and its referenced entity', async () => {
    const userId = await seedUser();
    const grafo = await prisma.grafosConhecimento.create({
      data: { usuarioId: userId, nome: 'G' },
    });
    const conceitoId = await linkConcept(userId, grafo.id, 'C');

    const res = await deleteNode.execute(userId, conceitoId, grafo.id);

    expect(res).toEqual({ success: true, deletedType: 'CONCEITO' });
    expect(await prisma.conceito.count()).toBe(0);
    expect(await prisma.nodeConhecimento.count()).toBe(0);
  });

  it('deletes the graph and its owned concepts', async () => {
    const userId = await seedUser();
    const grafo = await prisma.grafosConhecimento.create({
      data: { usuarioId: userId, nome: 'G' },
    });
    await linkConcept(userId, grafo.id, 'C1');
    await linkConcept(userId, grafo.id, 'C2');

    await deleteGraph.execute(userId, grafo.id, []);

    expect(await prisma.grafosConhecimento.count()).toBe(0);
    expect(await prisma.conceito.count()).toBe(0);
  });

  it('keeps an entity shared with another graph (only unlinks it)', async () => {
    const userId = await seedUser();
    const g1 = await prisma.grafosConhecimento.create({ data: { usuarioId: userId, nome: 'G1' } });
    const g2 = await prisma.grafosConhecimento.create({ data: { usuarioId: userId, nome: 'G2' } });
    const conceito = await prisma.conceito.create({ data: { usuarioId: userId, nome: 'Shared' } });
    for (const grafoId of [g1.id, g2.id]) {
      await prisma.nodeConhecimento.create({
        data: { usuarioId: userId, grafoId, tipoNode: 'CONCEITO', referenciaId: conceito.id },
      });
    }

    await deleteGraph.execute(userId, g1.id, []);

    expect(await prisma.conceito.count()).toBe(1);
    expect(await prisma.nodeConhecimento.count()).toBe(1);
  });
});
