import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../../../prisma/prisma.service';
import type { CurriculumQuery } from '../../domain/ports/curriculum-query';
import type {
  ConceptHierarchyAssunto,
  FilterAssunto,
  SubjectSummary,
  TreeAssunto,
  TreeConceito,
  TreeTopico,
} from '../../domain/curriculum-views';

const NAME = { id: true, nome: true } as const;
const TREE_SELECT = {
  id: true,
  nome: true,
  topicos: { select: { ...NAME, conceitos: { select: NAME } } },
} as const;

type TreeRow = Prisma.AssuntoGetPayload<{ select: typeof TREE_SELECT }>;
type TopicoRow = TreeRow['topicos'][number];
type ConceitoRow = TopicoRow['conceitos'][number];

@Injectable()
export class PrismaCurriculumQuery implements CurriculumQuery {
  constructor(private readonly prisma: PrismaService) {}

  async listSubjects(userId: string): Promise<SubjectSummary[]> {
    const assuntos = await this.prisma.assunto.findMany({
      where: { usuarioId: userId },
      select: { id: true, nome: true, descricao: true, topicos: { select: NAME } },
      orderBy: { nome: 'asc' },
    });
    return assuntos.map((a) => ({
      id: a.id,
      nome: a.nome,
      descricao: a.descricao,
      topicos: a.topicos,
    }));
  }

  async conceptHierarchy(userId: string): Promise<ConceptHierarchyAssunto[]> {
    const assuntos = await this.prisma.assunto.findMany({
      where: { usuarioId: userId },
      select: TREE_SELECT,
      orderBy: { nome: 'asc' },
    });
    return assuntos.map((a) => ({ id: a.id, nome: a.nome, topicos: a.topicos }));
  }

  async flashcardFilterData(userId: string): Promise<FilterAssunto[]> {
    const assuntos = await this.prisma.assunto.findMany({
      where: { usuarioId: userId },
      select: { id: true, nome: true, topicos: { select: { ...NAME, assuntoId: true } } },
    });
    return assuntos.map((a) => ({
      id: a.id,
      nome: a.nome,
      topicos: a.topicos.map((t) => ({ id: t.id, nome: t.nome, assuntoId: t.assuntoId ?? a.id })),
    }));
  }

  async hierarquiaTree(userId: string): Promise<TreeAssunto[]> {
    const assuntos = await this.prisma.assunto.findMany({
      where: { usuarioId: userId },
      select: TREE_SELECT,
    });
    return assuntos.map(toTreeAssunto);
  }
}

function toTreeAssunto(a: TreeRow): TreeAssunto {
  return {
    id: a.id,
    nome: a.nome,
    relAssuntoTopico: [
      { tipoRelacao: 'PERTENCE_A', topicos: a.topicos.map((t) => toTreeTopico(t, a)) },
    ],
  };
}

function toTreeTopico(t: TopicoRow, a: TreeRow): TreeTopico {
  return {
    id: t.id,
    nome: t.nome,
    assuntoId: a.id,
    relacoesTopicoConceito: t.conceitos.length
      ? [{ tipoRelacao: 'FUNDAMENTA', conceitos: t.conceitos.map((c) => toTreeConceito(c, t, a)) }]
      : [],
  };
}

function toTreeConceito(c: ConceitoRow, t: TopicoRow, a: TreeRow): TreeConceito {
  return {
    id: c.id,
    nome: c.nome,
    topicoId: t.id,
    topicoNome: t.nome,
    assuntoId: a.id,
    assuntoNome: a.nome,
  };
}
