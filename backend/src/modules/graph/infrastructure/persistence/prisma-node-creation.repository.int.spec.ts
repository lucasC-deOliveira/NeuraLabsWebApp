import { Test } from '@nestjs/testing';
import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import { PrismaService } from '../../../../prisma/prisma.service';
import { PrismaNodeCreationRepository } from './prisma-node-creation.repository';
import { CreateNodeUseCase } from '../../application/use-cases/create-node.use-case';
import { GraphNotFoundError } from '../../domain/errors';

// Integration of the node-creation adapter against the real DB (neuralabs_test),
// driven by the CreateNode use-case. Validates entity + link creation.

const TABLES = [
  '"NodeConhecimento"',
  '"conceitos"',
  '"notas"',
  '"grafos_conhecimento"',
  '"usuarios"',
];

describe('Node creation (integration — neuralabs_test)', () => {
  let prisma: PrismaService;
  let createNode: CreateNodeUseCase;

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({ providers: [PrismaService] }).compile();
    prisma = moduleRef.get(PrismaService);
    await prisma.$connect();
    createNode = new CreateNodeUseCase(new PrismaNodeCreationRepository(prisma));
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

  it('creates a concept entity and its graph link', async () => {
    const { userId, grafoId } = await seedGraph();
    const { nodeId } = await createNode.execute(userId, grafoId, {
      tipoNode: 'CONCEITO',
      nome: 'Mitose',
    });

    expect(await prisma.conceito.findUnique({ where: { id: nodeId } })).toMatchObject({
      nome: 'Mitose',
    });
    const link = await prisma.nodeConhecimento.findFirst({
      where: { referenciaId: nodeId, contidoEm: { some: { grafoId } } },
    });
    expect(link?.tipoNode).toBe('CONCEITO');
  });

  it('creates a note with a generated slug', async () => {
    const { userId, grafoId } = await seedGraph();
    const { nodeId } = await createNode.execute(userId, grafoId, {
      tipoNode: 'NOTA',
      titulo: 'Divisão Celular',
      subtipo: 'EXPLICACAO',
    });

    const nota = await prisma.nota.findUnique({ where: { id: nodeId } });
    expect(nota?.subtipo).toBe('EXPLICACAO');
    expect(nota?.slug).toContain('divisao-celular');
  });

  it('throws when the graph is not owned', async () => {
    const { grafoId } = await seedGraph();
    const intruder = await seedGraph();
    await expect(
      createNode.execute(intruder.userId, grafoId, { tipoNode: 'CONCEITO', nome: 'X' }),
    ).rejects.toBeInstanceOf(GraphNotFoundError);
  });
});
