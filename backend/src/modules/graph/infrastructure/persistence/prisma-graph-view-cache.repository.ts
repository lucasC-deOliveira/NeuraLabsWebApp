import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../../../prisma/prisma.service';
import type { GraphView } from '../../domain/ports/graph-view-repository';
import type {
  CachedGraphView,
  GraphViewCacheRepository,
} from '../../domain/ports/graph-view-cache-repository';

const ms = (d: Date | null | undefined): number => d?.getTime() ?? 0;

@Injectable()
export class PrismaGraphViewCacheRepository implements GraphViewCacheRepository {
  constructor(private readonly prisma: PrismaService) {}

  // Signature from cheap aggregates: node/edge counts + their max timestamps +
  // the graph's own updatedAt + the study state of its flashcards. Any structural
  // change, position update, edge edit, rename OR review changes it — invalidando
  // o cache sem rebuild.
  //
  // O escopo segue a VISTA (grafo_nodes), igual ao buildKnowledgeGraph: os nós que
  // o grafo contém e as arestas cujas duas pontas ele contém. Se a assinatura
  // olhasse o modelo antigo (id_grafo), conter/soltar um nó não invalidaria nada e
  // a tela ficaria velha.
  async currentSignature(userId: string, grafoId: string): Promise<string> {
    const [vista, conteudo, arestas, estudo, grafo] = await Promise.all([
      this.assinaturaDaVista(grafoId),
      this.assinaturaDoConteudo(userId, grafoId),
      this.assinaturaDasArestas(grafoId),
      this.assinaturaDoEstudo(userId, grafoId),
      this.prisma.grafosConhecimento.findFirst({
        where: { id: grafoId, usuarioId: userId },
        select: { dataAtualizacao: true },
      }),
    ]);
    return `${vista}:${conteudo}:${arestas}:${estudo}:${ms(grafo?.dataAtualizacao)}`;
  }

  // O domínio do grafo sai do SRS dos flashcards (mapa de calor), que vive em
  // AprendizadoFlashcard — fora de NodeConhecimento. Revisar um card não bumpa o
  // nó, então sem esta parte o mapa de calor congelaria após a primeira montagem.
  private async assinaturaDoEstudo(userId: string, grafoId: string): Promise<string> {
    const rows = await this.prisma.$queryRaw<{ max: Date | null }[]>`
      SELECT MAX(a.ultima_revisao) AS max
      FROM "AprendizadoFlashcard" a
      WHERE a.id_usuario = ${userId}
        AND a.id_flashcard IN (
          SELECT n.referencia_id FROM "NodeConhecimento" n
          JOIN grafo_nodes gn ON gn.id_node = n.id
          WHERE gn.id_grafo = ${grafoId} AND n."tipoNode" = 'FLASHCARD'
        )`;
    return `${ms(rows[0]?.max)}`;
  }

  // Quem está na vista. Conter/soltar não toca no nó, então sem esta parte trocar
  // um nó por outro (contagem igual) passaria batido.
  private async assinaturaDaVista(grafoId: string): Promise<string> {
    const c = await this.prisma.grafoNode.aggregate({
      where: { grafoId },
      _count: true,
      _max: { dataCriacao: true },
    });
    return `${c._count}:${ms(c._max.dataCriacao)}`;
  }

  // O que mudou nos nós da vista (posição, domínio, conteúdo).
  private async assinaturaDoConteudo(userId: string, grafoId: string): Promise<string> {
    const n = await this.prisma.nodeConhecimento.aggregate({
      where: { usuarioId: userId, contidoEm: { some: { grafoId } } },
      _max: { ultimaAtualizacao: true },
    });
    return `${ms(n._max.ultimaAtualizacao)}`;
  }

  private async assinaturaDasArestas(grafoId: string): Promise<string> {
    const contido = { some: { grafoId } };
    const e = await this.prisma.conhecimentoAresta.aggregate({
      where: { nodeOrigem: { contidoEm: contido }, nodeDestino: { contidoEm: contido } },
      _count: true,
      _max: { ultimaAtualizacao: true },
    });
    return `${e._count}:${ms(e._max.ultimaAtualizacao)}`;
  }

  async load(grafoId: string): Promise<CachedGraphView | null> {
    const row = await this.prisma.graphViewCache.findUnique({
      where: { grafoId },
      select: { assinatura: true, dados: true },
    });
    if (!row) return null;
    return { assinatura: row.assinatura, view: row.dados as unknown as GraphView };
  }

  async save(userId: string, grafoId: string, assinatura: string, view: GraphView): Promise<void> {
    const dados = view as unknown as Prisma.InputJsonValue;
    await this.prisma.graphViewCache.upsert({
      where: { grafoId },
      create: { usuarioId: userId, grafoId, assinatura, dados },
      update: { assinatura, dados },
    });
  }
}
