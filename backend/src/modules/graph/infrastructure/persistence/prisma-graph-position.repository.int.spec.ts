import { Test } from '@nestjs/testing';
import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import { PrismaService } from '../../../../prisma/prisma.service';
import { PrismaGraphPositionRepository } from './prisma-graph-position.repository';
import { SavePositionsUseCase } from '../../application/use-cases/save-positions.use-case';

// Integration of the position adapter against the real DB (neuralabs_test),
// driven by the SavePositions use-case. Validates the typed update scoping.

const TABLES = ['"NodeConhecimento"', '"conceitos"', '"grafos_conhecimento"', '"usuarios"'];

describe('Graph positions (integration — neuralabs_test)', () => {
  let prisma: PrismaService;
  let savePositions: SavePositionsUseCase;

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({ providers: [PrismaService] }).compile();
    prisma = moduleRef.get(PrismaService);
    await prisma.$connect();
    savePositions = new SavePositionsUseCase(new PrismaGraphPositionRepository(prisma));
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  beforeEach(async () => {
    await prisma.$executeRawUnsafe(`TRUNCATE TABLE ${TABLES.join(',')} RESTART IDENTITY CASCADE`);
  });

  let seq = 0;
  it('moves a node to the given position', async () => {
    const user = await prisma.usuario.create({
      data: { nome: 'Teste', email: `u${seq++}-${Date.now()}@test.com`, senhaHash: 'x' },
    });
    const grafo = await prisma.grafosConhecimento.create({
      data: { usuarioId: user.id, nome: 'G' },
    });
    const conceito = await prisma.conceito.create({ data: { usuarioId: user.id, nome: 'C' } });
    const node = await prisma.nodeConhecimento.create({
      data: {
        usuarioId: user.id,
        tipoNode: 'CONCEITO',
        referenciaId: conceito.id,
      },
    });
    // "Estar num grafo" é a contenção — é ela que a vista lê.
    await prisma.grafoNode.create({
      data: { grafoId: grafo.id, nodeId: node.id, posicaoX: 0, posicaoY: 0 },
    });

    await savePositions.execute(user.id, grafo.id, {
      [`conceito:${conceito.id}`]: { x: 42, y: 24 },
    });

    // A posição é da VISTA: quem manda é a contenção.
    const naVista = await prisma.grafoNode.findUnique({
      where: { grafoId_nodeId: { grafoId: grafo.id, nodeId: node.id } },
    });
    expect(naVista?.posicaoX).toBe(42);
    expect(naVista?.posicaoY).toBe(24);
  });

  // Arrastar um nó no grafo A não pode movê-lo no grafo B: cada vista tem a sua.
  it('moves the node only in the graph it was dragged in', async () => {
    const user = await prisma.usuario.create({
      data: { nome: 'Teste', email: `u${seq++}-${Date.now()}@test.com`, senhaHash: 'x' },
    });
    const [a, b] = await Promise.all([
      prisma.grafosConhecimento.create({ data: { usuarioId: user.id, nome: 'A' } }),
      prisma.grafosConhecimento.create({ data: { usuarioId: user.id, nome: 'B' } }),
    ]);
    const conceito = await prisma.conceito.create({ data: { usuarioId: user.id, nome: 'C' } });
    const node = await prisma.nodeConhecimento.create({
      data: { usuarioId: user.id, tipoNode: 'CONCEITO', referenciaId: conceito.id },
    });
    await prisma.grafoNode.createMany({
      data: [
        { grafoId: a.id, nodeId: node.id, posicaoX: 0, posicaoY: 0 },
        { grafoId: b.id, nodeId: node.id, posicaoX: 7, posicaoY: 7 },
      ],
    });

    await savePositions.execute(user.id, a.id, { [`conceito:${conceito.id}`]: { x: 42, y: 24 } });

    const emB = await prisma.grafoNode.findUnique({
      where: { grafoId_nodeId: { grafoId: b.id, nodeId: node.id } },
    });
    expect(emB?.posicaoX).toBe(7);
    expect(emB?.posicaoY).toBe(7);
  });
});
