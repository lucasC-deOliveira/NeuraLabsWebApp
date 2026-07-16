import { Test } from '@nestjs/testing';
import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import { PrismaService } from '../../../../prisma/prisma.service';
import { PrismaGraphQuery } from './prisma-graph.query';
import { parseGraphListQuery } from '../../domain/services/parse-graph-list-query';

// Integration of the Prisma graph read model against the real DB (neuralabs_test).
// Validates the children count, ordering and parent-name resolution.

const TABLES = ['"grafos_conhecimento"', '"usuarios"'];

describe('Graph query (integration — neuralabs_test)', () => {
  let prisma: PrismaService;
  let query: PrismaGraphQuery;

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({ providers: [PrismaService] }).compile();
    prisma = moduleRef.get(PrismaService);
    await prisma.$connect();
    query = new PrismaGraphQuery(prisma);
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

  const list = (raw: Parameters<typeof parseGraphListQuery>[0] = {}) => parseGraphListQuery(raw);

  async function seedAssuntoNode(userId: string, grafoId: string, nome: string): Promise<string> {
    const assunto = await prisma.assunto.create({ data: { usuarioId: userId, nome } });
    const node = await prisma.nodeConhecimento.create({
      data: { usuarioId: userId, grafoId, tipoNode: 'ASSUNTO', referenciaId: assunto.id },
    });
    // 'Estar no grafo' é a contenção — é ela que a listagem lê.
    await prisma.grafoNode.create({ data: { grafoId, nodeId: node.id } });
    return assunto.id;
  }

  async function assuntoNodeId(userId: string, referenciaId: string): Promise<string> {
    const node = await prisma.nodeConhecimento.findFirstOrThrow({
      where: { usuarioId: userId, referenciaId, tipoNode: 'ASSUNTO' },
      select: { id: true },
    });
    return node.id;
  }

  // Liga o nó ASSUNTO a um nó-alvo (conceito) via uma aresta do tipo/peso dados.
  async function linkAssunto(
    userId: string,
    grafoId: string,
    assuntoNode: string,
    tipoRelacao: 'CONTEM' | 'RELACIONADO',
  ): Promise<void> {
    const target = await prisma.nodeConhecimento.create({
      data: { usuarioId: userId, grafoId, tipoNode: 'CONCEITO', referenciaId: `ref-${seq++}` },
    });
    await prisma.grafoNode.create({ data: { grafoId, nodeId: target.id } });
    await prisma.conhecimentoAresta.create({
      data: { grafoId, nodeOrigemId: assuntoNode, nodeDestinoId: target.id, tipoRelacao, peso: 1 },
    });
  }

  it('weights assunto tags by connection count and type, ordering heaviest first', async () => {
    const userId = await seedUser();
    const g = await prisma.grafosConhecimento.create({ data: { usuarioId: userId, nome: 'G' } });
    const alpha = await seedAssuntoNode(userId, g.id, 'Alpha'); // leve (associativo)
    const zulu = await seedAssuntoNode(userId, g.id, 'Zulu'); // pesado (estrutural)
    await linkAssunto(userId, g.id, await assuntoNodeId(userId, alpha), 'RELACIONADO'); // 1×1 = 1
    await linkAssunto(userId, g.id, await assuntoNodeId(userId, zulu), 'CONTEM'); // 3×1 = 3

    const page = await query.listForUser(userId, list());
    const tags = page.items.find((x) => x.id === g.id)?.assuntos;
    expect(tags?.map((a) => a.nome)).toEqual(['Zulu', 'Alpha']); // peso vence o alfabético
    expect(tags?.map((a) => a.peso)).toEqual([3, 1]);
  });

  it('tags each graph with its ASSUNTO nodes and filters by assunto (OR)', async () => {
    const userId = await seedUser();
    const g1 = await prisma.grafosConhecimento.create({ data: { usuarioId: userId, nome: 'G1' } });
    const g2 = await prisma.grafosConhecimento.create({ data: { usuarioId: userId, nome: 'G2' } });
    const direito = await seedAssuntoNode(userId, g1.id, 'Direito');
    await seedAssuntoNode(userId, g1.id, 'Português');
    await seedAssuntoNode(userId, g2.id, 'Biologia');

    const all = await query.listForUser(userId, list());
    const tagsG1 = all.items.find((g) => g.id === g1.id)?.assuntos.map((a) => a.nome);
    expect(tagsG1).toEqual(['Direito', 'Português']); // ordenado por nome

    const filtered = await query.listForUser(userId, list({ assunto: direito }));
    expect(filtered.items.map((g) => g.id)).toEqual([g1.id]);
  });

  it('lists the distinct assuntos present across the user graphs', async () => {
    const userId = await seedUser();
    const g = await prisma.grafosConhecimento.create({ data: { usuarioId: userId, nome: 'G' } });
    await seedAssuntoNode(userId, g.id, 'Zoologia');
    await seedAssuntoNode(userId, g.id, 'Anatomia');

    const assuntos = await query.listAssuntos(userId);
    expect(assuntos.map((a) => a.nome)).toEqual(['Anatomia', 'Zoologia']); // ordenado
  });

  it('lists the user graphs newest-first with their children count', async () => {
    const userId = await seedUser();
    const parent = await prisma.grafosConhecimento.create({
      data: { usuarioId: userId, nome: 'Parent' },
    });
    await prisma.grafosConhecimento.create({
      data: { usuarioId: userId, nome: 'Child', parentGrafoId: parent.id },
    });

    const page = await query.listForUser(userId, list());
    expect(page.items.map((g) => g.nome)).toEqual(['Child', 'Parent']);
    expect(page.total).toBe(2);
    expect(page.items.find((g) => g.nome === 'Parent')?.filhosCount).toBe(1);
  });

  it('does not list graphs owned by another user', async () => {
    const owner = await seedUser();
    const other = await seedUser();
    await prisma.grafosConhecimento.create({ data: { usuarioId: owner, nome: 'Mine' } });

    const page = await query.listForUser(other, list());
    expect(page.items).toHaveLength(0);
    expect(page.total).toBe(0);
  });

  it('filters by root/subgraph type', async () => {
    const userId = await seedUser();
    const parent = await prisma.grafosConhecimento.create({
      data: { usuarioId: userId, nome: 'Root' },
    });
    await prisma.grafosConhecimento.create({
      data: { usuarioId: userId, nome: 'Sub', parentGrafoId: parent.id },
    });

    const roots = await query.listForUser(userId, list({ tipo: 'raiz' }));
    const subs = await query.listForUser(userId, list({ tipo: 'subgrafo' }));
    expect(roots.items.map((g) => g.nome)).toEqual(['Root']);
    expect(subs.items.map((g) => g.nome)).toEqual(['Sub']);
  });

  it('searches by name/description and paginates the total', async () => {
    const userId = await seedUser();
    await prisma.grafosConhecimento.create({ data: { usuarioId: userId, nome: 'Direito Penal' } });
    await prisma.grafosConhecimento.create({ data: { usuarioId: userId, nome: 'Biologia' } });
    await prisma.grafosConhecimento.create({
      data: { usuarioId: userId, nome: 'Química', descricao: 'ligação direito à saúde' },
    });

    const found = await query.listForUser(userId, list({ q: 'direito', pageSize: '1' }));
    expect(found.total).toBe(2); // "Direito Penal" + descrição de "Química"
    expect(found.items).toHaveLength(1); // pageSize limita a página
  });

  it('resolves the parent name in the info view', async () => {
    const userId = await seedUser();
    const parent = await prisma.grafosConhecimento.create({
      data: { usuarioId: userId, nome: 'Parent' },
    });
    const child = await prisma.grafosConhecimento.create({
      data: {
        usuarioId: userId,
        nome: 'Child',
        parentGrafoId: parent.id,
        tipoRelacaoPai: 'CONTEM',
      },
    });

    const info = await query.findInfo(userId, child.id);
    expect(info).toEqual({
      nome: 'Child',
      descricao: undefined,
      parentGrafoId: parent.id,
      parentNome: 'Parent',
      tipoRelacaoPai: 'CONTEM',
      filhosCount: 0,
    });
  });

  it('returns null for a graph the user does not own', async () => {
    const owner = await seedUser();
    const other = await seedUser();
    const g = await prisma.grafosConhecimento.create({ data: { usuarioId: owner, nome: 'X' } });

    expect(await query.findInfo(other, g.id)).toBeNull();
  });
});
