import { Test } from '@nestjs/testing';
import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import { PrismaService } from '../../../../prisma/prisma.service';
import { PrismaNodeDetailsQuery } from './prisma-node-details.query';
import { createContainedNode } from './node-containment';

// Integration of the node-details read model against the real DB (neuralabs_test).
// Validates the per-type projection and the ownership filter.

const TABLES = ['"notas"', '"assuntos"', '"usuarios"'];

describe('Node details query (integration — neuralabs_test)', () => {
  let prisma: PrismaService;
  let query: PrismaNodeDetailsQuery;

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({ providers: [PrismaService] }).compile();
    prisma = moduleRef.get(PrismaService);
    await prisma.$connect();
    query = new PrismaNodeDetailsQuery(prisma);
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  beforeEach(async () => {
    await prisma.$executeRawUnsafe(`TRUNCATE TABLE ${TABLES.join(',')} RESTART IDENTITY CASCADE`);
  });

  let seq = 0;
  async function seedUser(): Promise<string> {
    const user = await prisma.usuario.create({
      data: { nome: 'Teste', email: `u${seq++}-${Date.now()}@test.com`, senhaHash: 'x' },
    });
    return user.id;
  }

  it('projects an ASSUNTO with nome and descricao', async () => {
    const userId = await seedUser();
    const a = await prisma.assunto.create({
      data: { usuarioId: userId, nome: 'Bio', descricao: 'd' },
    });
    expect(await query.findDetails(userId, 'ASSUNTO', a.id)).toEqual({
      nome: 'Bio',
      descricao: 'd',
    });
  });

  it('projects a NOTA with its content fields', async () => {
    const userId = await seedUser();
    const n = await prisma.nota.create({
      data: { usuarioId: userId, titulo: 'T', conteudo: 'C', subtipo: 'DEFINICAO' },
    });
    expect(await query.findDetails(userId, 'NOTA', n.id)).toMatchObject({
      titulo: 'T',
      conteudo: 'C',
      subtipo: 'DEFINICAO',
    });
  });

  it('returns null for an entity owned by another user', async () => {
    const owner = await seedUser();
    const other = await seedUser();
    const a = await prisma.assunto.create({ data: { usuarioId: owner, nome: 'Mine' } });
    expect(await query.findDetails(other, 'ASSUNTO', a.id)).toBeNull();
  });

  it('returns null for an unknown node type', async () => {
    const userId = await seedUser();
    expect(await query.findDetails(userId, 'GRAFO_REF', 'whatever')).toBeNull();
  });

  it('exports the question ids of an exam in the saved order', async () => {
    const usuarioId = await seedUser();
    const [first, second] = await Promise.all(
      ['First', 'Second'].map((enunciado) =>
        prisma.questao.create({
          data: { usuarioId, enunciado, tipo: 'VERDADEIRO_FALSO', gabarito: 'V' },
        }),
      ),
    );
    const exam = await prisma.prova.create({ data: { usuarioId, titulo: 'Exam' } });
    await prisma.provaQuestao.createMany({
      data: [
        { provaId: exam.id, questaoId: second.id, ordem: 2 },
        { provaId: exam.id, questaoId: first.id, ordem: 1 },
      ],
    });
    expect(await query.findDetails(usuarioId, 'PROVA', exam.id)).toMatchObject({
      totalQuestoes: 2,
      questaoIds: [first.id, second.id],
    });
  });

  it('lists all owned views of the same concept', async () => {
    const usuarioId = await seedUser();
    const otherUser = await seedUser();
    const concept = await prisma.conceito.create({ data: { nome: 'Cell', usuarioId } });
    const graphs = await Promise.all(
      ['Biology', 'Review'].map((nome) =>
        prisma.grafosConhecimento.create({ data: { usuarioId, nome } }),
      ),
    );
    for (const { id: grafoId } of graphs) {
      await createContainedNode(prisma, {
        usuarioId,
        grafoId,
        tipoNode: 'CONCEITO',
        referenciaId: concept.id,
      });
    }
    const expected = graphs.map(({ id, nome }) => ({ id, name: nome }));
    expect(await query.findConceptGraphs(usuarioId, concept.id)).toEqual(expected);
    expect(await query.findConceptGraphs(otherUser, concept.id)).toEqual([]);
  });
});
