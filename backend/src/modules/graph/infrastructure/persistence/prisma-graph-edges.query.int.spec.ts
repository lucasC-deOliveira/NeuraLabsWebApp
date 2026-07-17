import { Test } from '@nestjs/testing';
import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import { PrismaService } from '../../../../prisma/prisma.service';
import { PrismaGraphEdgesQuery } from './prisma-graph-edges.query';

// Integration of the edges read model against the real DB (neuralabs_test).
// Validates the ownership filter and the endpoint labels.

const TABLES = [
  '"ConhecimentoAresta"',
  '"NodeConhecimento"',
  '"conceitos"',
  '"assuntos"',
  '"grafos_conhecimento"',
  '"usuarios"',
];

describe('Graph edges query (integration — neuralabs_test)', () => {
  let prisma: PrismaService;
  let query: PrismaGraphEdgesQuery;

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({ providers: [PrismaService] }).compile();
    prisma = moduleRef.get(PrismaService);
    await prisma.$connect();
    query = new PrismaGraphEdgesQuery(prisma);
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  beforeEach(async () => {
    await prisma.$executeRawUnsafe(`TRUNCATE TABLE ${TABLES.join(',')} RESTART IDENTITY CASCADE`);
  });

  let seq = 0;
  it('lists edges with labels resolved from the referenced entities', async () => {
    const user = await prisma.usuario.create({
      data: { nome: 'Teste', email: `u${seq++}-${Date.now()}@test.com`, senhaHash: 'x' },
    });
    const grafo = await prisma.grafosConhecimento.create({
      data: { usuarioId: user.id, nome: 'G' },
    });
    const assunto = await prisma.assunto.create({ data: { usuarioId: user.id, nome: 'Source' } });
    const conceito = await prisma.conceito.create({ data: { usuarioId: user.id, nome: 'Target' } });
    const origem = await prisma.nodeConhecimento.create({
      data: {
        usuarioId: user.id,
        tipoNode: 'ASSUNTO',
        referenciaId: assunto.id,
      },
    });
    const destino = await prisma.nodeConhecimento.create({
      data: {
        usuarioId: user.id,
        tipoNode: 'CONCEITO',
        referenciaId: conceito.id,
      },
    });
    // A vista mostra a aresta quando contém as DUAS pontas.
    await prisma.grafoNode.createMany({
      data: [
        { grafoId: grafo.id, nodeId: origem.id },
        { grafoId: grafo.id, nodeId: destino.id },
      ],
    });
    await prisma.conhecimentoAresta.create({
      data: {
        nodeOrigemId: origem.id,
        nodeDestinoId: destino.id,
        tipoRelacao: 'CONTEM',
      },
    });

    const edges = await query.listForGraph(user.id, grafo.id);

    expect(edges).toHaveLength(1);
    expect(edges[0]).toMatchObject({
      source: assunto.id,
      target: conceito.id,
      tipoRelacao: 'CONTEM',
      sourceLabel: 'Source',
      targetLabel: 'Target',
    });
  });
});
