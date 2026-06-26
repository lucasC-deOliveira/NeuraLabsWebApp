import { Test } from '@nestjs/testing';
import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import { PrismaService } from '../../../../prisma/prisma.service';
import { PrismaNodeContentSearchQuery } from './prisma-node-content-search.query';

// Integration of the content-search read model against the real DB
// (neuralabs_test). Validates the case-insensitive match scoped to the graph.

const TABLES = ['"NodeConhecimento"', '"notas"', '"grafos_conhecimento"', '"usuarios"'];

describe('Node content search query (integration — neuralabs_test)', () => {
  let prisma: PrismaService;
  let query: PrismaNodeContentSearchQuery;

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({ providers: [PrismaService] }).compile();
    prisma = moduleRef.get(PrismaService);
    await prisma.$connect();
    query = new PrismaNodeContentSearchQuery(prisma);
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  beforeEach(async () => {
    await prisma.$executeRawUnsafe(`TRUNCATE TABLE ${TABLES.join(',')} RESTART IDENTITY CASCADE`);
  });

  let seq = 0;
  async function seedNotaInGraph(content: string): Promise<{ userId: string; grafoId: string }> {
    const user = await prisma.usuario.create({
      data: { nome: 'Teste', email: `u${seq++}-${Date.now()}@test.com`, senhaHash: 'x' },
    });
    const grafo = await prisma.grafosConhecimento.create({
      data: { usuarioId: user.id, nome: 'G' },
    });
    const nota = await prisma.nota.create({
      data: { usuarioId: user.id, titulo: 'N', conteudo: content },
    });
    await prisma.nodeConhecimento.create({
      data: { usuarioId: user.id, grafoId: grafo.id, tipoNode: 'NOTA', referenciaId: nota.id },
    });
    return { userId: user.id, grafoId: grafo.id };
  }

  it('matches note content case-insensitively', async () => {
    const { userId, grafoId } = await seedNotaInGraph('A célula sofre Mitose aqui');
    expect(await query.matchingNodeRefs(userId, grafoId, 'mitose')).toHaveLength(1);
  });

  it('returns nothing when the term is absent from the content', async () => {
    const { userId, grafoId } = await seedNotaInGraph('texto qualquer');
    expect(await query.matchingNodeRefs(userId, grafoId, 'ausente')).toEqual([]);
  });
});
