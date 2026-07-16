import { Test } from '@nestjs/testing';
import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import { PrismaService } from '../../../../prisma/prisma.service';
import { TipoNode } from '@prisma/client';

// Contenção grafo↔nó (integração — neuralabs_test).
//
// Fase 1 da migração "nó do sistema": a tabela grafo_nodes é ADITIVA e ainda não é
// lida por ninguém — id_grafo no nó segue sendo a fonte da verdade. Estes testes
// travam as propriedades que as fases seguintes vão depender, para elas não serem
// descobertas quebradas lá na frente:
//   1. o mesmo nó pode estar em VÁRIOS grafos (é o ponto da mudança);
//   2. apagar o grafo apaga só a contenção, nunca o nó (a decisão do usuário);
//   3. apagar o nó leva a contenção junto (o inverso não vale).

const TABLES = ['"grafo_nodes"', '"NodeConhecimento"', '"grafos_conhecimento"', '"usuarios"'];

describe('GrafoNode: contenção (integração — neuralabs_test)', () => {
  let prisma: PrismaService;

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({ providers: [PrismaService] }).compile();
    prisma = moduleRef.get(PrismaService);
    await prisma.$connect();
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
      data: { nome: 'Teste', email: `gn${seq++}-${Date.now()}@test.com`, senhaHash: 'x' },
    });
    return user.id;
  }

  const seedGrafo = async (userId: string, nome: string): Promise<string> =>
    (await prisma.grafosConhecimento.create({ data: { usuarioId: userId, nome } })).id;

  const seedNode = async (userId: string): Promise<string> =>
    (
      await prisma.nodeConhecimento.create({
        data: {
          usuarioId: userId,
          tipoNode: TipoNode.CONCEITO,
          referenciaId: 'c-' + seq++,
        },
      })
    ).id;

  const contain = (grafoId: string, nodeId: string, x = 10, y = 20): Promise<unknown> =>
    prisma.grafoNode.create({ data: { grafoId, nodeId, posicaoX: x, posicaoY: y } });

  // O ponto da migração: hoje a unique do nó inclui grafoId, então a mesma entidade
  // precisa de uma LINHA por grafo. A contenção acaba com isso.
  it('lets one node be contained by several graphs', async () => {
    const userId = await seedUser();
    const [a, b] = [await seedGrafo(userId, 'A'), await seedGrafo(userId, 'B')];
    const nodeId = await seedNode(userId);

    await contain(a, nodeId);
    await contain(b, nodeId);

    const grafos = await prisma.grafoNode.findMany({
      where: { nodeId },
      select: { grafoId: true },
    });
    expect(grafos.map((g) => g.grafoId).sort()).toEqual([a, b].sort());
  });

  // A posição é da VISTA, não do nó: o mesmo conceito ocupa lugares diferentes em
  // cada grafo. É por isso que ela mora aqui e não em NodeConhecimento.
  it('keeps a position per graph for the same node', async () => {
    const userId = await seedUser();
    const [a, b] = [await seedGrafo(userId, 'A'), await seedGrafo(userId, 'B')];
    const nodeId = await seedNode(userId);

    await contain(a, nodeId, 1, 2);
    await contain(b, nodeId, 300, 400);

    expect(
      await prisma.grafoNode.findUnique({ where: { grafoId_nodeId: { grafoId: a, nodeId } } }),
    ).toMatchObject({ posicaoX: 1, posicaoY: 2 });
    expect(
      await prisma.grafoNode.findUnique({ where: { grafoId_nodeId: { grafoId: b, nodeId } } }),
    ).toMatchObject({ posicaoX: 300, posicaoY: 400 });
  });

  it('refuses to contain the same node twice in one graph', async () => {
    const userId = await seedUser();
    const a = await seedGrafo(userId, 'A');
    const nodeId = await seedNode(userId);

    await contain(a, nodeId);
    await expect(contain(a, nodeId)).rejects.toThrow();
  });

  // A decisão do usuário: apagar o grafo apaga a VISTA. O nó sobrevive — um card
  // classificado não pode sumir porque uma vista dele foi apagada.
  it('drops only the containment when the graph is deleted, never the node', async () => {
    const userId = await seedUser();
    const [a, b] = [await seedGrafo(userId, 'A'), await seedGrafo(userId, 'B')];
    // grafoId: null — na Fase 5 o nó não terá dono; aqui já provamos que sobrevive.
    const nodeId = await seedNode(userId);
    await contain(a, nodeId);
    await contain(b, nodeId);

    await prisma.grafosConhecimento.delete({ where: { id: a } });

    expect(await prisma.nodeConhecimento.findUnique({ where: { id: nodeId } })).not.toBeNull();
    const restantes = await prisma.grafoNode.findMany({ where: { nodeId } });
    expect(restantes.map((g) => g.grafoId)).toEqual([b]);
  });

  it('drops the containment when the node itself is deleted', async () => {
    const userId = await seedUser();
    const a = await seedGrafo(userId, 'A');
    const nodeId = await seedNode(userId);
    await contain(a, nodeId);

    await prisma.nodeConhecimento.delete({ where: { id: nodeId } });

    expect(await prisma.grafoNode.count({ where: { grafoId: a } })).toBe(0);
  });
});
