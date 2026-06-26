import { Test } from '@nestjs/testing';
import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import { PrismaService } from '../../../../prisma/prisma.service';
import { PrismaAddProvaRepository } from './prisma-add-prova.repository';
import { AddProvaToGraphUseCase } from '../../application/use-cases/add-prova-to-graph.use-case';
import { ProvaNotFoundError } from '../../domain/errors';

// Integration of the add-prova adapter against the real DB (neuralabs_test),
// driven by the AddProvaToGraph use-case. Validates idempotent linking.

const TABLES = ['"NodeConhecimento"', '"provas"', '"grafos_conhecimento"', '"usuarios"'];

describe('Add prova to graph (integration — neuralabs_test)', () => {
  let prisma: PrismaService;
  let addProva: AddProvaToGraphUseCase;

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({ providers: [PrismaService] }).compile();
    prisma = moduleRef.get(PrismaService);
    await prisma.$connect();
    addProva = new AddProvaToGraphUseCase(new PrismaAddProvaRepository(prisma));
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  beforeEach(async () => {
    await prisma.$executeRawUnsafe(`TRUNCATE TABLE ${TABLES.join(',')} RESTART IDENTITY CASCADE`);
  });

  let seq = 0;
  async function seedGraphWithProva(): Promise<{
    userId: string;
    grafoId: string;
    provaId: string;
  }> {
    const user = await prisma.usuario.create({
      data: { nome: 'Teste', email: `u${seq++}-${Date.now()}@test.com`, senhaHash: 'x' },
    });
    const grafo = await prisma.grafosConhecimento.create({
      data: { usuarioId: user.id, nome: 'G' },
    });
    const prova = await prisma.prova.create({ data: { usuarioId: user.id, titulo: 'P' } });
    return { userId: user.id, grafoId: grafo.id, provaId: prova.id };
  }

  it('links the exam and is idempotent', async () => {
    const { userId, grafoId, provaId } = await seedGraphWithProva();
    const first = await addProva.execute(userId, grafoId, provaId);
    const second = await addProva.execute(userId, grafoId, provaId);

    expect(second.nodeId).toBe(first.nodeId);
    expect(await prisma.nodeConhecimento.count({ where: { grafoId, tipoNode: 'PROVA' } })).toBe(1);
  });

  it('throws when the exam is not owned', async () => {
    const intruder = await seedGraphWithProva();
    await expect(
      addProva.execute(intruder.userId, intruder.grafoId, 'missing'),
    ).rejects.toBeInstanceOf(ProvaNotFoundError);
  });
});
