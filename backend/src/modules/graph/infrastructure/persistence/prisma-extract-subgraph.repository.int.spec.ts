import { Test } from '@nestjs/testing';
import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import { PrismaService } from '../../../../prisma/prisma.service';
import { PrismaExtractSubgraphRepository } from './prisma-extract-subgraph.repository';
import { ExtractSubgraphUseCase } from '../../application/use-cases/extract-subgraph.use-case';

// Integration of the extract-subgraph adapter against the real DB
// (neuralabs_test), driven by the ExtractSubgraph use-case. Validates moving
// nodes into the child and rewiring a boundary edge to the GRAFO_REF.

const TABLES = [
  '"ConhecimentoAresta"',
  '"NodeConhecimento"',
  '"conceitos"',
  '"grafos_conhecimento"',
  '"usuarios"',
];

describe('Subgraph extraction (integration — neuralabs_test)', () => {
  let prisma: PrismaService;
  let extractSubgraph: ExtractSubgraphUseCase;

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({ providers: [PrismaService] }).compile();
    prisma = moduleRef.get(PrismaService);
    await prisma.$connect();
    extractSubgraph = new ExtractSubgraphUseCase(new PrismaExtractSubgraphRepository(prisma));
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  beforeEach(async () => {
    await prisma.$executeRawUnsafe(`TRUNCATE TABLE ${TABLES.join(',')} RESTART IDENTITY CASCADE`);
  });

  let seq = 0;
  async function seedNode(userId: string, grafoId: string, referenciaId: string): Promise<string> {
    const node = await prisma.nodeConhecimento.create({
      data: {
        usuarioId: userId,
        grafoId,
        tipoNode: 'CONCEITO',
        referenciaId,
        posicaoX: 0,
        posicaoY: 0,
      },
    });
    return node.id;
  }

  it('moves the node to the child and rewires the boundary edge', async () => {
    const user = await prisma.usuario.create({
      data: { nome: 'Teste', email: `u${seq++}-${Date.now()}@test.com`, senhaHash: 'x' },
    });
    const parent = await prisma.grafosConhecimento.create({
      data: { usuarioId: user.id, nome: 'Parent' },
    });
    const inner = await seedNode(user.id, parent.id, 'ref-inner');
    const outer = await seedNode(user.id, parent.id, 'ref-outer');
    const edge = await prisma.conhecimentoAresta.create({
      data: {
        grafoId: parent.id,
        nodeOrigemId: inner,
        nodeDestinoId: outer,
        tipoRelacao: 'RELACIONADO',
      },
    });

    const res = await extractSubgraph.execute(user.id, parent.id, {
      nodeIds: ['ref-inner'],
      nome: 'Sub',
      tipoRelacao: 'APROFUNDA',
    });

    expect(res).toMatchObject({ movedCount: 1, rewiredEdgeCount: 1 });
    const movedNode = await prisma.nodeConhecimento.findUnique({ where: { id: inner } });
    expect(movedNode?.grafoId).toBe(res.grafoId);
    const ref = await prisma.nodeConhecimento.findFirst({
      where: { grafoId: parent.id, tipoNode: 'GRAFO_REF' },
    });
    const rewired = await prisma.conhecimentoAresta.findUnique({ where: { id: edge.id } });
    expect(rewired?.nodeOrigemId).toBe(ref?.id);
    expect(rewired?.nodeDestinoId).toBe(outer);
  });
});
