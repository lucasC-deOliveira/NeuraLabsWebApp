import { Test } from '@nestjs/testing';
import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import { PrismaService } from '../../../../prisma/prisma.service';
import { PrismaGraphViewRepository } from './prisma-graph-view.repository';

// Integration of the graph-view adapter against the real DB (neuralabs_test).
// Validates that the view loads the graph's linked nodes and ownership checks.

const TABLES = [
  '"grafo_nodes"',
  '"NodeConhecimento"',
  '"assuntos"',
  '"grafos_conhecimento"',
  '"usuarios"',
];

describe('Graph view (integration — neuralabs_test)', () => {
  let prisma: PrismaService;
  let repo: PrismaGraphViewRepository;

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({ providers: [PrismaService] }).compile();
    prisma = moduleRef.get(PrismaService);
    await prisma.$connect();
    repo = new PrismaGraphViewRepository(prisma);
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

  it('loads the view with the graph linked nodes', async () => {
    const { userId, grafoId } = await seedGraph();
    const assunto = await prisma.assunto.create({ data: { usuarioId: userId, nome: 'A' } });
    const node = await prisma.nodeConhecimento.create({
      data: { usuarioId: userId, grafoId, tipoNode: 'ASSUNTO', referenciaId: assunto.id },
    });
    // A vista mostra o que o grafo CONTÉM — não é mais a coluna id_grafo do nó.
    await prisma.grafoNode.create({ data: { grafoId, nodeId: node.id } });

    const view = await repo.loadView(userId, grafoId);
    expect(view.nodes.some((n) => n.type === 'ASSUNTO')).toBe(true);
  });

  // O ponto da migração: o nó é do sistema e pode aparecer em vários grafos. Aqui a
  // coluna id_grafo aponta para OUTRO grafo — quem manda é a contenção.
  it('shows a node contained by this graph even when its old grafoId points elsewhere', async () => {
    const { userId, grafoId } = await seedGraph();
    const outro = await prisma.grafosConhecimento.create({
      data: { usuarioId: userId, nome: 'Outro' },
    });
    const assunto = await prisma.assunto.create({ data: { usuarioId: userId, nome: 'A' } });
    const node = await prisma.nodeConhecimento.create({
      data: { usuarioId: userId, grafoId: outro.id, tipoNode: 'ASSUNTO', referenciaId: assunto.id },
    });
    await prisma.grafoNode.create({ data: { grafoId, nodeId: node.id } });

    const view = await repo.loadView(userId, grafoId);
    expect(view.nodes.some((n) => n.id === assunto.id)).toBe(true);
  });

  it('hides a node the graph does not contain, even if its old grafoId points here', async () => {
    const { userId, grafoId } = await seedGraph();
    const assunto = await prisma.assunto.create({ data: { usuarioId: userId, nome: 'A' } });
    await prisma.nodeConhecimento.create({
      data: { usuarioId: userId, grafoId, tipoNode: 'ASSUNTO', referenciaId: assunto.id },
    });

    const view = await repo.loadView(userId, grafoId);
    expect(view.nodes).toHaveLength(0);
  });

  it('reports ownership via exists', async () => {
    const { userId, grafoId } = await seedGraph();
    const other = await seedGraph();
    expect(await repo.exists(grafoId, userId)).toBe(true);
    expect(await repo.exists(grafoId, other.userId)).toBe(false);
  });
});
