import { Test } from '@nestjs/testing';
import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import { PrismaService } from '../../../../prisma/prisma.service';
import { PrismaGraphDeletionRepository } from './prisma-graph-deletion.repository';
import { DeleteGraphUseCase } from '../../application/use-cases/delete-graph.use-case';
import { DeleteNodeUseCase } from '../../application/use-cases/delete-node.use-case';
import { InMemoryCache } from '../../../cache/infrastructure/in-memory-cache';

// Integration of the deletion adapter against the real DB (neuralabs_test),
// driven by the Delete graph/node use-cases. Validates entity removal and the
// shared-entity rule.

const TABLES = [
  '"grafo_nodes"',
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
    deleteGraph = new DeleteGraphUseCase(repo, new InMemoryCache());
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
    const node = await prisma.nodeConhecimento.create({
      data: { usuarioId: userId, tipoNode: 'CONCEITO', referenciaId: conceito.id },
    });
    await prisma.grafoNode.create({ data: { grafoId, nodeId: node.id } });
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

  // A decisão: apagar o grafo apaga a VISTA. Antes este teste afirmava o oposito
  // ("deletes the graph and its owned concepts") — o grafo levava o conteúdo junto,
  // e um card classificado sumia porque você apagou uma vista dele.
  it('deletes the view, keeping the nodes and their entities', async () => {
    const userId = await seedUser();
    const grafo = await prisma.grafosConhecimento.create({
      data: { usuarioId: userId, nome: 'G' },
    });
    await linkConcept(userId, grafo.id, 'C1');
    await linkConcept(userId, grafo.id, 'C2');

    await deleteGraph.execute(userId, grafo.id);

    expect(await prisma.grafosConhecimento.count()).toBe(0);
    // A vista some…
    expect(await prisma.grafoNode.count()).toBe(0);
    // …e o conteúdo fica.
    expect(await prisma.conceito.count()).toBe(2);
    expect(await prisma.nodeConhecimento.count()).toBe(2);
  });

  it('leaves the other graphs of a shared node untouched', async () => {
    const userId = await seedUser();
    const g1 = await prisma.grafosConhecimento.create({ data: { usuarioId: userId, nome: 'G1' } });
    const g2 = await prisma.grafosConhecimento.create({ data: { usuarioId: userId, nome: 'G2' } });
    const conceito = await prisma.conceito.create({ data: { usuarioId: userId, nome: 'Shared' } });
    // Um nó só, contido pelos dois grafos — o ponto do nó ser do sistema.
    const node = await prisma.nodeConhecimento.create({
      data: { usuarioId: userId, tipoNode: 'CONCEITO', referenciaId: conceito.id },
    });
    await prisma.grafoNode.createMany({
      data: [
        { grafoId: g1.id, nodeId: node.id },
        { grafoId: g2.id, nodeId: node.id },
      ],
    });

    await deleteGraph.execute(userId, g1.id);

    expect(await prisma.conceito.count()).toBe(1);
    expect(await prisma.nodeConhecimento.count()).toBe(1);
    const restantes = await prisma.grafoNode.findMany({ select: { grafoId: true } });
    expect(restantes.map((r) => r.grafoId)).toEqual([g2.id]);
  });
});
