import { Test } from '@nestjs/testing';
import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import { PrismaService } from '../../../../prisma/prisma.service';
import { PrismaInsightContextRepository } from './prisma-insight-context.repository';

// Integration of the insight-context adapter against the real DB (neuralabs_test).
// Validates target lookup, neighbor split and the rich content map.

const TABLES = [
  '"ConhecimentoAresta"',
  '"NodeConhecimento"',
  '"conceitos"',
  '"grafos_conhecimento"',
  '"usuarios"',
];

describe('Insight context (integration — neuralabs_test)', () => {
  let prisma: PrismaService;
  let repo: PrismaInsightContextRepository;

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({ providers: [PrismaService] }).compile();
    prisma = moduleRef.get(PrismaService);
    await prisma.$connect();
    repo = new PrismaInsightContextRepository(prisma);
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  beforeEach(async () => {
    await prisma.$executeRawUnsafe(`TRUNCATE TABLE ${TABLES.join(',')} RESTART IDENTITY CASCADE`);
  });

  let seq = 0;
  it('returns null for a node absent from the graph', async () => {
    const user = await prisma.usuario.create({
      data: { nome: 'Teste', email: `u${seq++}-${Date.now()}@test.com`, senhaHash: 'x' },
    });
    const grafo = await prisma.grafosConhecimento.create({
      data: { usuarioId: user.id, nome: 'G' },
    });
    expect(await repo.loadInsightContext(user.id, grafo.id, 'ghost')).toBeNull();
  });

  it('splits direct neighbors from other nodes', async () => {
    const user = await prisma.usuario.create({
      data: { nome: 'Teste', email: `u${seq++}-${Date.now()}@test.com`, senhaHash: 'x' },
    });
    const grafo = await prisma.grafosConhecimento.create({
      data: { usuarioId: user.id, nome: 'G' },
    });
    const concepts = await Promise.all(
      ['target', 'neighbor', 'other'].map((nome) =>
        prisma.conceito.create({ data: { usuarioId: user.id, nome } }),
      ),
    );
    const nodes = await Promise.all(
      concepts.map((c) =>
        prisma.nodeConhecimento.create({
          data: { usuarioId: user.id, grafoId: grafo.id, tipoNode: 'CONCEITO', referenciaId: c.id },
        }),
      ),
    );
    // "Estar no grafo" é a contenção — é ela que o repositório lê.
    await prisma.grafoNode.createMany({
      data: nodes.map((n) => ({ grafoId: grafo.id, nodeId: n.id })),
    });
    await prisma.conhecimentoAresta.create({
      data: {
        grafoId: grafo.id,
        nodeOrigemId: nodes[0].id,
        nodeDestinoId: nodes[1].id,
        tipoRelacao: 'PREREQUISITO',
      },
    });

    const ctx = await repo.loadInsightContext(user.id, grafo.id, concepts[0].id);
    expect(ctx?.grafoNome).toBe('G');
    expect(ctx?.target.nome).toBe('target');
    expect(ctx?.neighbors.map((n) => n.nome)).toEqual(['neighbor']);
    expect(ctx?.others.map((n) => n.nome)).toEqual(['other']);
  });
});
