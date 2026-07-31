import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../../prisma/prisma.service';
import type {
  ConceptMasterySource,
  FeynmanClarityRow,
  FlashcardStateRow,
  QuestionStatRow,
} from '../../domain/ports/concept-mastery-source';

interface RawFlashcard {
  conceito_id: string;
  dificuldade: number;
  intervalo: number;
  proxima_revisao: Date;
}
interface RawQuestion {
  conceito_id: string;
  total: bigint;
  acertos: bigint;
}
interface RawFeynman {
  conceito_id: string;
  clareza: number;
}

// ACL sobre o Postgres para as evidências de domínio. SQL cru: o caminho
// flashcard → aresta DEFINE → conceito não é expresso pelo agregador do Prisma.
@Injectable()
export class PrismaConceptMasterySource implements ConceptMasterySource {
  constructor(private readonly prisma: PrismaService) {}

  // SM-2 de cada card, marcado pelo conceito que ele DEFINE. Um card pode definir
  // vários conceitos (várias arestas) — cada par vira uma linha.
  async flashcardStates(userId: string): Promise<FlashcardStateRow[]> {
    const rows = await this.prisma.$queryRaw<RawFlashcard[]>`
      SELECT cn."referencia_id" AS conceito_id,
             ap.dificuldade AS dificuldade, ap.intervalo AS intervalo,
             ap.proxima_revisao AS proxima_revisao
      FROM "AprendizadoFlashcard" ap
      JOIN "NodeConhecimento" fn ON fn."referencia_id" = ap.id_flashcard
        AND fn."tipoNode" = 'FLASHCARD' AND fn.id_usuario = ${userId}
      JOIN "ConhecimentoAresta" a ON a.id_node_origem = fn.id AND a."tipoRelacao" = 'DEFINE'
      JOIN "NodeConhecimento" cn ON cn.id = a.id_node_destino AND cn."tipoNode" = 'CONCEITO'
      WHERE ap.id_usuario = ${userId}
    `;
    return rows.map((r) => ({
      conceitoId: r.conceito_id,
      dificuldade: r.dificuldade,
      intervalo: r.intervalo,
      proximaRevisao: r.proxima_revisao,
    }));
  }

  async questionStats(userId: string): Promise<QuestionStatRow[]> {
    const rows = await this.prisma.$queryRaw<RawQuestion[]>`
      SELECT q.id_conceito AS conceito_id, COUNT(*) AS total,
             SUM(CASE WHEN r.acertou THEN 1 ELSE 0 END) AS acertos
      FROM respostas_questao r
      JOIN questoes q ON q.id = r.id_questao AND q.id_usuario = ${userId}
      WHERE q.id_conceito IS NOT NULL
      GROUP BY q.id_conceito
    `;
    return rows.map((r) => ({
      conceitoId: r.conceito_id,
      total: Number(r.total),
      acertos: Number(r.acertos),
    }));
  }

  // Última clareza da explicação Feynman de cada conceito (estado SM-2 do Feynman).
  async feynmanClarity(userId: string): Promise<FeynmanClarityRow[]> {
    const rows = await this.prisma.$queryRaw<RawFeynman[]>`
      SELECT alvo_id AS conceito_id, ultima_clareza AS clareza
      FROM estados_feynman
      WHERE id_usuario = ${userId} AND alvo_tipo = 'CONCEITO'
    `;
    return rows.map((r) => ({ conceitoId: r.conceito_id, clareza: r.clareza }));
  }

  async conceptNames(userId: string, conceitoIds: string[]): Promise<Map<string, string>> {
    if (conceitoIds.length === 0) return new Map();
    const conceitos = await this.prisma.conceito.findMany({
      where: { usuarioId: userId, id: { in: conceitoIds } },
      select: { id: true, nome: true },
    });
    return new Map(conceitos.map((c) => [c.id, c.nome]));
  }
}
