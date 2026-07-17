import { Injectable } from '@nestjs/common';
import { Prisma, TipoNode } from '@prisma/client';
import { PrismaService } from '../../../../prisma/prisma.service';
import type { BaralhoQuery } from '../../domain/ports/baralho-query';
import type {
  BaralhoCard,
  BaralhoDetail,
  BaralhoListItem,
  BaralhoOrigin,
} from '../../domain/baralho-views';
import { groupBaralhoOrigins, type BaralhoNodeRow } from '../../domain/services/baralho-origins';
import { countDeckStats, type DeckCardSchedule } from '../../domain/services/deck-stats';
import type { ConceptTag } from '../../../curriculum/domain/curriculum-views';
import { PrismaConnectedConceptsQuery } from '../../../curriculum/infrastructure/persistence/prisma-connected-concepts.query';

const CARD_INCLUDE = { conceito: true } satisfies Prisma.FlashcardInclude;
type CardRow = Prisma.FlashcardGetPayload<{ include: typeof CARD_INCLUDE }>;

// Só o agendamento mais recente de cada cartão alimenta os contadores da listagem.
const CARD_SRS_SELECT = {
  aprendizado: {
    take: 1,
    orderBy: { ultimaRevisao: 'desc' },
    select: { dificuldade: true, proximaRevisao: true },
  },
} satisfies Prisma.FlashcardSelect;

type CardSrsRow = Prisma.FlashcardGetPayload<{ select: typeof CARD_SRS_SELECT }>;

const scheduleOf = (card: CardSrsRow): DeckCardSchedule | null => card.aprendizado[0] ?? null;

@Injectable()
export class PrismaBaralhoQuery implements BaralhoQuery {
  constructor(
    private readonly prisma: PrismaService,
    private readonly connected: PrismaConnectedConceptsQuery,
  ) {}

  async listBaralhos(userId: string): Promise<BaralhoListItem[]> {
    const rows = await this.prisma.baralho.findMany({
      where: { usuarioId: userId },
      select: {
        id: true,
        titulo: true,
        dataCriacao: true,
        flashcards: { select: CARD_SRS_SELECT },
      },
      orderBy: { dataCriacao: 'desc' },
    });
    const origens = await this.origins(
      userId,
      rows.map((r) => r.id),
    );
    return rows.map((r) => toListItem(r, origens.get(r.id) ?? [], new Date()));
  }

  async getBaralho(userId: string, baralhoId: string): Promise<BaralhoDetail | null> {
    const row = await this.prisma.baralho.findFirst({
      where: { id: baralhoId, usuarioId: userId },
      include: { flashcards: { include: CARD_INCLUDE, orderBy: { dataCriacao: 'desc' } } },
    });
    if (!row) return null;
    const origens = await this.origins(userId, [baralhoId]);
    // As tags vêm do grafo, como na listagem de flashcards — mesmo leitor.
    const connected = await this.connected.forFlashcards(
      userId,
      row.flashcards.map((fc) => fc.id),
    );
    return {
      id: row.id,
      titulo: row.titulo,
      dataCriacao: row.dataCriacao,
      origens: origens.get(row.id) ?? [],
      cards: row.flashcards.map((fc) => toCard(fc, connected.get(fc.id) ?? [])),
    };
  }

  // Grafos em que cada baralho tem um nó espelho (tipoNode BARALHO).
  private async origins(
    userId: string,
    baralhoIds: string[],
  ): Promise<Map<string, BaralhoOrigin[]>> {
    if (baralhoIds.length === 0) return new Map();
    // As origens de um baralho são os grafos que o CONTÊM — podem ser vários, que é
    // o que "origens" sempre quis dizer. Antes vinham da coluna id_grafo do nó, que
    // só sabia apontar para um.
    const rows = await this.prisma.nodeConhecimento.findMany({
      where: { usuarioId: userId, tipoNode: TipoNode.BARALHO, referenciaId: { in: baralhoIds } },
      select: { referenciaId: true, contidoEm: { select: { grafoId: true } } },
    });
    const nodes = rows.flatMap((n) =>
      n.contidoEm.map((c) => ({ referenciaId: n.referenciaId, grafoId: c.grafoId })),
    );
    return groupBaralhoOrigins(nodes, await this.graphNames(nodes));
  }

  private async graphNames(nodes: BaralhoNodeRow[]): Promise<Map<string, string>> {
    const ids = [...new Set(nodes.map((n) => n.grafoId).filter((id): id is string => id !== null))];
    if (ids.length === 0) return new Map();
    const grafos = await this.prisma.grafosConhecimento.findMany({
      where: { id: { in: ids } },
      select: { id: true, nome: true },
    });
    return new Map(grafos.map((g) => [g.id, g.nome]));
  }
}

interface ListRow {
  id: string;
  titulo: string;
  dataCriacao: Date;
  flashcards: CardSrsRow[];
}

function toListItem(row: ListRow, origens: BaralhoOrigin[], now: Date): BaralhoListItem {
  const stats = countDeckStats(row.flashcards.map(scheduleOf), now);
  return {
    id: row.id,
    titulo: row.titulo,
    totalCards: stats.total,
    novos: stats.novos,
    aprender: stats.aprender,
    revisar: stats.revisar,
    dataCriacao: row.dataCriacao,
    origens,
  };
}

function toCard(fc: CardRow, conceitosConectados: ConceptTag[]): BaralhoCard {
  return {
    id: fc.id,
    pergunta: fc.pergunta,
    resposta: fc.resposta,
    tipo: fc.tipo ?? null,
    conceito: fc.conceito?.nome ?? '',
    conceitosConectados,
  };
}
