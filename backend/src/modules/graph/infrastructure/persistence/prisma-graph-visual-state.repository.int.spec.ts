import { Test } from '@nestjs/testing';
import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import { PrismaService } from '../../../../prisma/prisma.service';
import { PrismaGraphVisualStateRepository } from './prisma-graph-visual-state.repository';
import { SaveVisualStateUseCase } from '../../application/use-cases/save-visual-state.use-case';
import { LoadVisualStateUseCase } from '../../application/use-cases/load-visual-state.use-case';

// Integration of the visual-state adapter against the real DB (neuralabs_test),
// driven by the Save/Load use-cases. Validates the round-trip and ownership.

const TABLES = ['"grafos_conhecimento"', '"usuarios"'];

describe('Graph visual state (integration — neuralabs_test)', () => {
  let prisma: PrismaService;
  let saveVisual: SaveVisualStateUseCase;
  let loadVisual: LoadVisualStateUseCase;

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({ providers: [PrismaService] }).compile();
    prisma = moduleRef.get(PrismaService);
    await prisma.$connect();
    const repo = new PrismaGraphVisualStateRepository(prisma);
    saveVisual = new SaveVisualStateUseCase(repo);
    loadVisual = new LoadVisualStateUseCase(repo);
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

  it('round-trips the visual state', async () => {
    const { userId, grafoId } = await seedGraph();
    await saveVisual.execute(userId, grafoId, { zoom: 1.5, x: 10 });
    expect(await loadVisual.execute(userId, grafoId)).toEqual({ zoom: 1.5, x: 10 });
  });

  it('returns null before any state is saved', async () => {
    const { userId, grafoId } = await seedGraph();
    expect(await loadVisual.execute(userId, grafoId)).toBeNull();
  });

  it('does not save into a graph owned by another user', async () => {
    const { grafoId } = await seedGraph();
    const intruder = await seedGraph();
    await saveVisual.execute(intruder.userId, grafoId, { hacked: true });

    const row = await prisma.grafosConhecimento.findUnique({ where: { id: grafoId } });
    expect(row?.estadoVisual).toBeNull();
  });
});
