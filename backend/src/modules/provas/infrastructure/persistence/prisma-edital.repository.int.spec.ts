import { Test } from '@nestjs/testing';
import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import { PrismaService } from '../../../../prisma/prisma.service';
import { PrismaEditalRepository } from './prisma-edital.repository';

// Integration of the edital adapter against the real DB (neuralabs_test). Regression
// for the COBRE FK bug: conceitoNodeIds are referenciaIds, so they must be resolved to
// their CONCEITO node before the edge (writing a referenciaId as an endpoint threw P2003).

const TABLES = [
  '"ConhecimentoAresta"',
  '"NodeConhecimento"',
  '"editais"',
  '"conceitos"',
  '"grafos_conhecimento"',
  '"usuarios"',
];

describe('PrismaEditalRepository (integration — neuralabs_test)', () => {
  let prisma: PrismaService;
  let repo: PrismaEditalRepository;

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({ providers: [PrismaService] }).compile();
    prisma = moduleRef.get(PrismaService);
    await prisma.$connect();
    repo = new PrismaEditalRepository(prisma);
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  beforeEach(async () => {
    await prisma.$executeRawUnsafe(`TRUNCATE TABLE ${TABLES.join(',')} RESTART IDENTITY CASCADE`);
  });

  let seq = 0;
  async function seed(): Promise<{ userId: string; grafoId: string; conceitoId: string }> {
    const user = await prisma.usuario.create({
      data: { nome: 'T', email: `u${seq++}-${Date.now()}@test.com`, senhaHash: 'x' },
    });
    const grafo = await prisma.grafosConhecimento.create({
      data: { usuarioId: user.id, nome: 'G' },
    });
    const conceito = await prisma.conceito.create({ data: { usuarioId: user.id, nome: 'Mitose' } });
    // The concept already has a graph node (as the build would have created it).
    await prisma.nodeConhecimento.create({
      data: {
        usuarioId: user.id,
        tipoNode: 'CONCEITO',
        referenciaId: conceito.id,
      },
    });
    return { userId: user.id, grafoId: grafo.id, conceitoId: conceito.id };
  }

  it('links the EDITAL node to each covered concept with a COBRE edge (resolving refIds)', async () => {
    const { userId, grafoId, conceitoId } = await seed();

    const { editalId } = await repo.create(userId, {
      titulo: 'SERPRO',
      programa: '...',
      grafoId,
      conceitoNodeIds: [conceitoId], // referenciaId, not a node id
    });

    const editalNode = await prisma.nodeConhecimento.findFirst({
      where: { tipoNode: 'EDITAL', referenciaId: editalId, contidoEm: { some: { grafoId } } },
    });
    const conceitoNode = await prisma.nodeConhecimento.findFirst({
      where: { tipoNode: 'CONCEITO', referenciaId: conceitoId, contidoEm: { some: { grafoId } } },
    });
    const edges = await prisma.conhecimentoAresta.findMany({
      where: { tipoRelacao: 'COBRE', nodeOrigemId: editalNode!.id },
    });
    expect(edges).toHaveLength(1);
    expect(edges[0].nodeDestinoId).toBe(conceitoNode!.id);
  });
});
