import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../../prisma/prisma.service';
import type { ChatNodesRepository } from '../../domain/ports/chat-nodes-repository';
import type { ChatContextNode } from '../../domain/services/chat-context';
import { refIdsByType } from './structural-nodes';

type Named = { id: string; nome: string; descricao: string | null };
type NotaRow = { id: string; titulo: string; conteudo: string };

const NAMED_SELECT = { id: true, nome: true, descricao: true } as const;

const named = (rows: Named[], tipo: string): ChatContextNode[] =>
  rows.map((r) => ({ id: r.id, tipo, nome: r.nome, corpo: r.descricao }));

const combine = (topicos: Named[], conceitos: Named[], notas: NotaRow[]): ChatContextNode[] => [
  ...named(topicos, 'TOPICO'),
  ...named(conceitos, 'CONCEITO'),
  ...notas.map((n) => ({ id: n.id, tipo: 'NOTA', nome: n.titulo, corpo: n.conteudo })),
];

@Injectable()
export class PrismaChatNodesRepository implements ChatNodesRepository {
  constructor(private readonly prisma: PrismaService) {}

  async loadChatNodes(userId: string, grafoId: string): Promise<ChatContextNode[]> {
    const ids = await refIdsByType(this.prisma, userId, grafoId);
    const [topicos, conceitos, notas] = await Promise.all([
      this.prisma.topico.findMany({
        where: { id: { in: ids.TOPICO ?? [] } },
        select: NAMED_SELECT,
      }),
      this.prisma.conceito.findMany({
        where: { id: { in: ids.CONCEITO ?? [] } },
        select: NAMED_SELECT,
      }),
      this.prisma.nota.findMany({
        where: { id: { in: ids.NOTA ?? [] } },
        select: { id: true, titulo: true, conteudo: true },
      }),
    ]);
    return combine(topicos, conceitos, notas);
  }
}
