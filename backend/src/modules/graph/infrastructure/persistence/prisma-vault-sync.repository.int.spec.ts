import { Test } from '@nestjs/testing';
import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import { PrismaService } from '../../../../prisma/prisma.service';
import { PrismaVaultSyncRepository } from './prisma-vault-sync.repository';
import { SyncVaultUseCase } from '../../application/use-cases/sync-vault.use-case';

// Integration of the vault-sync adapter against the real DB (neuralabs_test),
// driven by the SyncVault use-case. Covers upsert, edge replacement and unlink.

const TABLES = [
  '"ConhecimentoAresta"',
  '"NodeConhecimento"',
  '"conceitos"',
  '"grafos_conhecimento"',
  '"usuarios"',
];

describe('Vault sync (integration — neuralabs_test)', () => {
  let prisma: PrismaService;
  let syncVault: SyncVaultUseCase;

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({ providers: [PrismaService] }).compile();
    prisma = moduleRef.get(PrismaService);
    await prisma.$connect();
    syncVault = new SyncVaultUseCase(new PrismaVaultSyncRepository(prisma));
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

  it('creates entities, node links and an edge from the vault', async () => {
    const { userId, grafoId } = await seedGraph();
    const res = await syncVault.execute(userId, grafoId, {
      nodes: [
        { ref: 'c1', tipo: 'CONCEITO', nome: 'Mitose' },
        { ref: 'c2', tipo: 'CONCEITO', nome: 'Meiose' },
      ],
      edges: [{ origem: 'c1', destino: 'c2', relacao: 'PREREQUISITO' }],
    });

    expect(res).toMatchObject({ created: 2, edges: 1, removed: 0 });
    expect(await prisma.conceito.count()).toBe(2);
    expect(await prisma.conhecimentoAresta.count({ where: { grafoId } })).toBe(1);
  });

  it('unlinks a node whose entity is absent from a non-empty vault', async () => {
    const { userId, grafoId } = await seedGraph();
    await syncVault.execute(userId, grafoId, {
      nodes: [
        { ref: 'c1', tipo: 'CONCEITO', nome: 'A' },
        { ref: 'c2', tipo: 'CONCEITO', nome: 'B' },
      ],
      edges: [],
    });

    const res = await syncVault.execute(userId, grafoId, {
      nodes: [{ ref: 'c1', tipo: 'CONCEITO', nome: 'A' }],
      edges: [],
    });

    expect(res.removed).toBe(1);
    expect(await prisma.nodeConhecimento.count({ where: { grafoId } })).toBe(1);
  });
});
