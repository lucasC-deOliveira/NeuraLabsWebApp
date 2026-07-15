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

  // Sumir da pasta = "não está mais NESTE grafo", nunca "deixou de existir". Antes
  // isto apagava a linha do nó; com o nó do sistema, apagar um .md de uma pasta
  // destruiria o card em todos os outros grafos.
  it('releases from the view a node whose entity is absent from a non-empty vault', async () => {
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
    // A vista ficou com um; o conceito que saiu dela continua existindo.
    expect(await prisma.grafoNode.count({ where: { grafoId } })).toBe(1);
    expect(await prisma.conceito.findUnique({ where: { id: 'c2' } })).not.toBeNull();
  });

  // Um Push não pode apagar o que é de outra vista: a aresta é um fato entre
  // entidades, e só as arestas DESTE grafo são reconciliadas.
  it('does not touch an edge that lives in another graph', async () => {
    const { userId, grafoId } = await seedGraph();
    const outro = await prisma.grafosConhecimento.create({
      data: { usuarioId: userId, nome: 'Outro' },
    });
    await syncVault.execute(userId, outro.id, {
      nodes: [
        { ref: 'x1', tipo: 'CONCEITO', nome: 'X' },
        { ref: 'x2', tipo: 'CONCEITO', nome: 'Y' },
      ],
      edges: [{ de: 'x1', para: 'x2', relacao: 'RELACIONADO', peso: 1 }],
    });
    const antes = await prisma.conhecimentoAresta.count();

    // Push de um grafo diferente, sem nenhuma aresta.
    await syncVault.execute(userId, grafoId, {
      nodes: [{ ref: 'c1', tipo: 'CONCEITO', nome: 'A' }],
      edges: [],
    });

    expect(await prisma.conhecimentoAresta.count()).toBe(antes);
  });
});
