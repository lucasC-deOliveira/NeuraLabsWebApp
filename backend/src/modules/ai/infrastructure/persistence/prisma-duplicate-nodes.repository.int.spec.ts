import { Test } from '@nestjs/testing';
import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import { PrismaService } from '../../../../prisma/prisma.service';
import { PrismaDuplicateNodesRepository } from './prisma-duplicate-nodes.repository';

// Integration of the duplicate-nodes read adapter against the real DB
// (neuralabs_test). Validates that only the graph's structural nodes load.

const TABLES = [
  '"NodeConhecimento"',
  '"conceitos"',
  '"assuntos"',
  '"grafos_conhecimento"',
  '"usuarios"',
];

describe('Duplicate nodes (integration — neuralabs_test)', () => {
  let prisma: PrismaService;
  let repo: PrismaDuplicateNodesRepository;

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({ providers: [PrismaService] }).compile();
    prisma = moduleRef.get(PrismaService);
    await prisma.$connect();
    repo = new PrismaDuplicateNodesRepository(prisma);
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  beforeEach(async () => {
    await prisma.$executeRawUnsafe(`TRUNCATE TABLE ${TABLES.join(',')} RESTART IDENTITY CASCADE`);
  });

  let seq = 0;
  it('loads the structural nodes of the graph with their description', async () => {
    const user = await prisma.usuario.create({
      data: { nome: 'Teste', email: `u${seq++}-${Date.now()}@test.com`, senhaHash: 'x' },
    });
    const grafo = await prisma.grafosConhecimento.create({
      data: { usuarioId: user.id, nome: 'G' },
    });
    const assunto = await prisma.assunto.create({
      data: { usuarioId: user.id, nome: 'Bio', descricao: 'd' },
    });
    const conceito = await prisma.conceito.create({ data: { usuarioId: user.id, nome: 'Mitose' } });
    for (const [tipoNode, referenciaId] of [
      ['ASSUNTO', assunto.id],
      ['CONCEITO', conceito.id],
    ] as const) {
      await prisma.nodeConhecimento.create({
        data: { usuarioId: user.id, grafoId: grafo.id, tipoNode, referenciaId },
      });
    }

    const nodes = await repo.loadGraphNodes(user.id, grafo.id);
    expect(nodes).toEqual([
      { id: assunto.id, tipo: 'ASSUNTO', nome: 'Bio', desc: 'd' },
      { id: conceito.id, tipo: 'CONCEITO', nome: 'Mitose', desc: '' },
    ]);
  });
});
