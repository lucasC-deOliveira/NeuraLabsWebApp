import { Test } from '@nestjs/testing';
import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import { PrismaService } from '../../../../prisma/prisma.service';
import { PrismaQuestaoGraphWriter } from './prisma-questao-graph-writer';
import type { QuestaoConceitoLink } from '../../domain/prova';

// Integration of the graph writer against the real DB (neuralabs_test): it must
// materialize QUESTION nodes, reuse an existing CONCEITO, create a new one, wire
// TESTA edges, and be idempotent on re-run.

const TABLES = [
  '"ConhecimentoAresta"',
  '"NodeConhecimento"',
  '"questoes"',
  '"conceitos"',
  '"grafos_conhecimento"',
  '"usuarios"',
];

describe('PrismaQuestaoGraphWriter (integration — neuralabs_test)', () => {
  let prisma: PrismaService;
  let writer: PrismaQuestaoGraphWriter;

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({ providers: [PrismaService] }).compile();
    prisma = moduleRef.get(PrismaService);
    await prisma.$connect();
    writer = new PrismaQuestaoGraphWriter(prisma);
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  beforeEach(async () => {
    await prisma.$executeRawUnsafe(`TRUNCATE TABLE ${TABLES.join(',')} RESTART IDENTITY CASCADE`);
  });

  async function seed(): Promise<{
    userId: string;
    grafoId: string;
    conceitoId: string;
    q1: string;
    q2: string;
  }> {
    const user = await prisma.usuario.create({
      data: { nome: 'T', email: `u-${Date.now()}@test.com`, senhaHash: 'x' },
    });
    const grafo = await prisma.grafosConhecimento.create({
      data: { usuarioId: user.id, nome: 'G' },
    });
    const conceito = await prisma.conceito.create({
      data: { usuarioId: user.id, nome: 'Esterificação' },
    });
    const mk = (enunciado: string): Promise<{ id: string }> =>
      prisma.questao.create({
        data: { usuarioId: user.id, tipo: 'MULTIPLA_ESCOLHA', enunciado, gabarito: '?' },
        select: { id: true },
      });
    const q1 = await mk('Q1');
    const q2 = await mk('Q2');
    return { userId: user.id, grafoId: grafo.id, conceitoId: conceito.id, q1: q1.id, q2: q2.id };
  }

  it('creates QUESTION nodes and TESTA edges, reusing existing and creating new concepts', async () => {
    const s = await seed();
    const links: QuestaoConceitoLink[] = [
      // Multidisciplinary: reuses the existing concept + a brand-new one.
      {
        questaoId: s.q1,
        conceitos: [
          { nome: 'Esterificação', conceitoId: s.conceitoId },
          { nome: 'Craqueamento de alcanos', conceitoId: null },
        ],
      },
      // Same new concept name again → must reuse the one just created, not duplicate.
      { questaoId: s.q2, conceitos: [{ nome: 'Craqueamento de alcanos', conceitoId: null }] },
    ];

    await writer.linkQuestoesToGrafo(s.userId, s.grafoId, links);

    const conceitos = await prisma.conceito.findMany({ where: { usuarioId: s.userId } });
    expect(conceitos.map((c) => c.nome).sort()).toEqual([
      'Craqueamento de alcanos',
      'Esterificação',
    ]);

    const questionNodes = await prisma.nodeConhecimento.findMany({
      where: { grafoId: s.grafoId, tipoNode: 'QUESTION' },
    });
    expect(questionNodes.map((n) => n.referenciaId).sort()).toEqual([s.q1, s.q2].sort());

    const edges = await prisma.conhecimentoAresta.findMany({ where: { grafoId: s.grafoId } });
    expect(edges).toHaveLength(3); // q1→esterificação, q1→craqueamento, q2→craqueamento
    expect(edges.every((e) => e.tipoRelacao === 'TESTA')).toBe(true);
  });

  it('is idempotent: re-linking the same data adds no duplicate nodes or edges', async () => {
    const s = await seed();
    const links: QuestaoConceitoLink[] = [
      { questaoId: s.q1, conceitos: [{ nome: 'Esterificação', conceitoId: s.conceitoId }] },
    ];
    await writer.linkQuestoesToGrafo(s.userId, s.grafoId, links);
    await writer.linkQuestoesToGrafo(s.userId, s.grafoId, links);

    const nodes = await prisma.nodeConhecimento.count({ where: { grafoId: s.grafoId } });
    const edges = await prisma.conhecimentoAresta.count({ where: { grafoId: s.grafoId } });
    expect(nodes).toBe(2); // one QUESTION + one CONCEITO
    expect(edges).toBe(1);
  });
});
