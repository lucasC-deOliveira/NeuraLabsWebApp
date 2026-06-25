import { PrismaService } from '../../../../prisma/prisma.service';

// Shared loader for a graph's structural nodes (ASSUNTO/TOPICO/CONCEITO) with
// their descriptions — used by several AI read adapters.
export type StructuralTipo = 'ASSUNTO' | 'TOPICO' | 'CONCEITO';

export interface StructuralNode {
  id: string;
  tipo: StructuralTipo;
  nome: string;
  descricao: string | null;
}

const SELECT = { id: true, nome: true, descricao: true } as const;
type Row = { id: string; nome: string; descricao: string | null };

const tag = (rows: Row[], tipo: StructuralTipo): StructuralNode[] =>
  rows.map((r) => ({ id: r.id, tipo, nome: r.nome, descricao: r.descricao }));

export async function loadStructuralNodes(
  prisma: PrismaService,
  userId: string,
  grafoId: string,
): Promise<StructuralNode[]> {
  const ids = await refIdsByType(prisma, userId, grafoId);
  const [assuntos, topicos, conceitos] = await Promise.all([
    prisma.assunto.findMany({ where: { id: { in: ids.ASSUNTO ?? [] } }, select: SELECT }),
    prisma.topico.findMany({ where: { id: { in: ids.TOPICO ?? [] } }, select: SELECT }),
    prisma.conceito.findMany({ where: { id: { in: ids.CONCEITO ?? [] } }, select: SELECT }),
  ]);
  return [...tag(assuntos, 'ASSUNTO'), ...tag(topicos, 'TOPICO'), ...tag(conceitos, 'CONCEITO')];
}

async function refIdsByType(
  prisma: PrismaService,
  userId: string,
  grafoId: string,
): Promise<Record<string, string[]>> {
  const nodes = await prisma.nodeConhecimento.findMany({
    where: { grafoId, usuarioId: userId },
    select: { tipoNode: true, referenciaId: true },
  });
  const ids: Record<string, string[]> = {};
  for (const n of nodes) (ids[n.tipoNode] ??= []).push(n.referenciaId);
  return ids;
}
