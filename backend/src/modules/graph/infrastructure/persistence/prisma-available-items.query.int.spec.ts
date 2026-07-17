import { Test } from '@nestjs/testing';
import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import { PrismaService } from '../../../../prisma/prisma.service';
import { PrismaAvailableItemsQuery } from './prisma-available-items.query';

// Integration of the available-items read model against the real DB
// (neuralabs_test). Validates the in-graph exclusion and the hierarchy label.

const TABLES = [
  '"NodeConhecimento"',
  '"flashcards"',
  '"conceitos"',
  '"topicos"',
  '"assuntos"',
  '"grafos_conhecimento"',
  '"usuarios"',
];

describe('Available items query (integration — neuralabs_test)', () => {
  let prisma: PrismaService;
  let query: PrismaAvailableItemsQuery;

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({ providers: [PrismaService] }).compile();
    prisma = moduleRef.get(PrismaService);
    await prisma.$connect();
    query = new PrismaAvailableItemsQuery(prisma);
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

  it('lists a flashcard with its full hierarchy', async () => {
    const { userId, grafoId } = await seedGraph();
    const assunto = await prisma.assunto.create({ data: { usuarioId: userId, nome: 'Bio' } });
    const topico = await prisma.topico.create({
      data: { usuarioId: userId, nome: 'Divisão', assuntoId: assunto.id },
    });
    const conceito = await prisma.conceito.create({
      data: { usuarioId: userId, nome: 'Mitose', topicoId: topico.id },
    });
    await prisma.flashcard.create({
      data: { usuarioId: userId, pergunta: 'Q', resposta: 'A', conceitoId: conceito.id },
    });

    const view = await query.listForGraph(userId, grafoId);
    expect(view.flashcards).toHaveLength(1);
    expect(view.flashcards[0]?.hierarquia).toBe('Bio → Divisão → Mitose');
  });

  it('excludes flashcards already in the graph', async () => {
    const { userId, grafoId } = await seedGraph();
    const fc = await prisma.flashcard.create({
      data: { usuarioId: userId, pergunta: 'Q', resposta: 'A' },
    });
    const node = await prisma.nodeConhecimento.create({
      data: { usuarioId: userId, tipoNode: 'FLASHCARD', referenciaId: fc.id },
    });
    await prisma.grafoNode.create({ data: { grafoId, nodeId: node.id } });

    const view = await query.listForGraph(userId, grafoId);
    expect(view.flashcards).toHaveLength(0);
  });
});
