import { Test } from '@nestjs/testing';
import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import { PrismaService } from '../../../../prisma/prisma.service';
import { PrismaGraphRepository } from './prisma-graph.repository';
import { CreateGraphUseCase } from '../../application/use-cases/create-graph.use-case';
import { RenameGraphUseCase } from '../../application/use-cases/rename-graph.use-case';
import { MASTER_GRAPH_NAME } from '../../application/use-cases/create-graph.use-case';
import { PrismaCreateSubgraphRepository } from './prisma-create-subgraph.repository';

// Integration of the Prisma graph adapter against the real DB (neuralabs_test),
// driven by the Create/Rename graph use-cases. Graphs start empty (no root
// subject) and rename only touches the graph's own name.

const TABLES = [
  '"grafo_nodes"',
  '"NodeConhecimento"',
  '"grafos_conhecimento"',
  '"assuntos"',
  '"usuarios"',
];

describe('Graph repository (integration — neuralabs_test)', () => {
  let prisma: PrismaService;
  let createGraph: CreateGraphUseCase;
  let renameGraph: RenameGraphUseCase;

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({ providers: [PrismaService] }).compile();
    prisma = moduleRef.get(PrismaService);
    await prisma.$connect();
    const repo = new PrismaGraphRepository(prisma);
    createGraph = new CreateGraphUseCase(repo, new PrismaCreateSubgraphRepository(prisma));
    renameGraph = new RenameGraphUseCase(repo);
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

  // "Criar grafo" cria um SUBGRAFO do master — o app tem um grafo só. O master é
  // criado sob demanda, e o novo grafo pendura nele por um GRAFO_REF.
  it('creates a subgraph under a lazily-created master', async () => {
    const userId = await seedUser();
    const { id } = await createGraph.execute(userId, 'Biology');

    const grafo = await prisma.grafosConhecimento.findUnique({ where: { id } });
    expect(grafo?.nome).toBe('Biology');

    // O master nasceu como raiz; o novo grafo tem o master como pai.
    const master = await prisma.grafosConhecimento.findFirst({
      where: { usuarioId: userId, parentGrafoId: null },
    });
    expect(master?.nome).toBe(MASTER_GRAPH_NAME);
    expect(grafo?.parentGrafoId).toBe(master?.id);

    // E o master o mostra via um nó GRAFO_REF contido.
    const ref = await prisma.nodeConhecimento.findFirst({
      where: {
        tipoNode: 'GRAFO_REF',
        referenciaId: id,
        contidoEm: { some: { grafoId: master!.id } },
      },
    });
    expect(ref).not.toBeNull();
  });

  it('creates only one master across several graphs', async () => {
    const userId = await seedUser();
    await createGraph.execute(userId, 'A');
    await createGraph.execute(userId, 'B');

    const roots = await prisma.grafosConhecimento.count({
      where: { usuarioId: userId, parentGrafoId: null },
    });
    expect(roots).toBe(1);
  });

  it('renames the graph', async () => {
    const userId = await seedUser();
    const { id } = await createGraph.execute(userId, 'Old');

    await renameGraph.execute(userId, id, '  New  ');

    const grafo = await prisma.grafosConhecimento.findUnique({ where: { id } });
    expect(grafo?.nome).toBe('New');
  });

  it('does not rename a graph owned by another user', async () => {
    const owner = await seedUser();
    const intruder = await seedUser();
    const { id } = await createGraph.execute(owner, 'Mine');

    await renameGraph.execute(intruder, id, 'Hacked');

    const grafo = await prisma.grafosConhecimento.findUnique({ where: { id } });
    expect(grafo?.nome).toBe('Mine');
  });
});
