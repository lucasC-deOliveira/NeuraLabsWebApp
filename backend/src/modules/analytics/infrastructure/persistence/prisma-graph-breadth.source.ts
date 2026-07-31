import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../../prisma/prisma.service';
import type {
  GraphBreadth,
  GraphBreadthSource,
  TerritoryItem,
} from '../../domain/ports/graph-breadth-source';

interface RawBreadth {
  tipo: string;
  total: number;
}
interface RawTerritory {
  referencia_id: string;
  tipo: 'ASSUNTO' | 'TOPICO';
  nome: string;
}

// ACL sobre o Postgres para a AMPLITUDE do mapa. Conta nós distintos por tipo; o
// território recente vem da data em que o nó entrou num grafo (grafo_nodes).
@Injectable()
export class PrismaGraphBreadthSource implements GraphBreadthSource {
  constructor(private readonly prisma: PrismaService) {}

  async breadth(userId: string): Promise<GraphBreadth> {
    const rows = await this.prisma.$queryRaw<RawBreadth[]>`
      SELECT "tipoNode" AS tipo, COUNT(*)::int AS total
      FROM "NodeConhecimento"
      WHERE id_usuario = ${userId} AND "tipoNode" IN ('CONCEITO', 'TOPICO', 'ASSUNTO')
      GROUP BY "tipoNode"
    `;
    return toBreadth(rows);
  }

  // Assuntos/tópicos cuja 1ª entrada em um grafo é recente — o "novo território".
  // O nome vem da entidade (assuntos/topicos) referenciada pelo nó.
  async recentTerritory(userId: string, since: Date): Promise<TerritoryItem[]> {
    const rows = await this.prisma.$queryRaw<RawTerritory[]>`
      SELECT n.referencia_id AS referencia_id, n."tipoNode" AS tipo,
             COALESCE(a.nome, t.nome, n.referencia_id) AS nome
      FROM "NodeConhecimento" n
      JOIN grafo_nodes gn ON gn.id_node = n.id
      LEFT JOIN assuntos a ON a.id = n.referencia_id AND n."tipoNode" = 'ASSUNTO'
      LEFT JOIN topicos t ON t.id = n.referencia_id AND n."tipoNode" = 'TOPICO'
      WHERE n.id_usuario = ${userId} AND n."tipoNode" IN ('ASSUNTO', 'TOPICO')
      GROUP BY n.id, n.referencia_id, n."tipoNode", a.nome, t.nome
      HAVING MIN(gn.data_criacao) >= ${since}
      ORDER BY MIN(gn.data_criacao) DESC
      LIMIT 20
    `;
    return rows.map((r) => ({ referenciaId: r.referencia_id, nome: r.nome, tipo: r.tipo }));
  }
}

function toBreadth(rows: RawBreadth[]): GraphBreadth {
  const by = new Map(rows.map((r) => [r.tipo, Number(r.total)]));
  return {
    concepts: by.get('CONCEITO') ?? 0,
    topics: by.get('TOPICO') ?? 0,
    subjects: by.get('ASSUNTO') ?? 0,
  };
}
