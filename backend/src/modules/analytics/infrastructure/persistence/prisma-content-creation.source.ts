import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../../../prisma/prisma.service';
import type {
  ContentCreationSource,
  ContentKind,
  CreatedTotals,
  CreationEvent,
} from '../../domain/ports/content-creation-source';

// Tabelas de conteúdo com data_criacao + id_usuario diretos. O nó (grafo_nodes) sai
// à parte por precisar do join a NodeConhecimento para recuperar o dono.
const SIMPLE_TABLES: { kind: ContentKind; table: string }[] = [
  { kind: 'flashcard', table: 'flashcards' },
  { kind: 'questao', table: 'questoes' },
  { kind: 'baralho', table: 'baralhos' },
  { kind: 'prova', table: 'provas' },
  { kind: 'edital', table: 'editais' },
  { kind: 'feynman', table: 'explicacoes_feynman' },
  { kind: 'nota', table: 'notas' },
];

const NODES_JOIN = Prisma.raw('grafo_nodes gn JOIN "NodeConhecimento" n ON n.id = gn.id_node');

interface RawTotal {
  kind: ContentKind;
  total: number;
}

// ACL sobre o Postgres para os sinais de CRIAÇÃO. SQL cru + UNION ALL: agregar a
// criação de 8 tabelas heterogêneas por usuário não é expresso pelo Prisma.
@Injectable()
export class PrismaContentCreationSource implements ContentCreationSource {
  constructor(private readonly prisma: PrismaService) {}

  // Cada criação datada (janela), para a ofensiva. Duplicatas no mesmo dia (nó em 2
  // grafos) não afetam o streak, que só olha dias distintos.
  async creationEvents(userId: string, since: Date): Promise<CreationEvent[]> {
    const simple = SIMPLE_TABLES.map(
      (t) =>
        Prisma.sql`SELECT data_criacao AS data FROM ${Prisma.raw(t.table)} WHERE id_usuario = ${userId} AND data_criacao >= ${since}`,
    );
    const node = Prisma.sql`SELECT gn.data_criacao AS data FROM ${NODES_JOIN} WHERE n.id_usuario = ${userId} AND gn.data_criacao >= ${since}`;
    const rows = await this.prisma.$queryRaw<{ data: Date }[]>(
      Prisma.join([...simple, node], ' UNION ALL '),
    );
    return rows.map((r) => ({ data: r.data }));
  }

  // Totais all-time por tipo (COUNT indexado por id_usuario). Nó = distintos, não
  // contenções (um nó em 2 grafos conta uma vez como conteúdo criado).
  async creationTotals(userId: string): Promise<CreatedTotals> {
    const simple = SIMPLE_TABLES.map(
      (t) =>
        Prisma.sql`SELECT ${t.kind} AS kind, COUNT(*)::int AS total FROM ${Prisma.raw(t.table)} WHERE id_usuario = ${userId}`,
    );
    const node = Prisma.sql`SELECT 'node' AS kind, COUNT(DISTINCT gn.id_node)::int AS total FROM ${NODES_JOIN} WHERE n.id_usuario = ${userId}`;
    const rows = await this.prisma.$queryRaw<RawTotal[]>(
      Prisma.join([...simple, node], ' UNION ALL '),
    );
    return toTotals(rows);
  }
}

function toTotals(rows: RawTotal[]): CreatedTotals {
  const base: CreatedTotals = {
    flashcard: 0,
    questao: 0,
    baralho: 0,
    prova: 0,
    edital: 0,
    feynman: 0,
    nota: 0,
    node: 0,
  };
  for (const r of rows) base[r.kind] = Number(r.total);
  return base;
}
