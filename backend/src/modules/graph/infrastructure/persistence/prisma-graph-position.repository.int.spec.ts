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
        grafoId: grafo.id,
        tipoNode: 'CONCEITO',
        referenciaId: conceito.id,
        posicaoX: 0,
        posicaoY: 0,
      },
    });

    await savePositions.execute(user.id, grafo.id, {
      [`conceito:${conceito.id}`]: { x: 42, y: 24 },
    });

    const updated = await prisma.nodeConhecimento.findUnique({ where: { id: node.id } });
    expect(updated?.posicaoX).toBe(42);
    expect(updated?.posicaoY).toBe(24);
  });
});
