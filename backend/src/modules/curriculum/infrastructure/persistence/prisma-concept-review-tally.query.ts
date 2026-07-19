import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../../prisma/prisma.service';
import type { ConceptReviewTallyQuery } from '../../domain/ports/concept-review-tally-query';
import type { ConceptReviewTally } from '../../domain/services/concept-error-ranking';

interface TallyRow {
  conceito_id: string;
  nome: string;
  revisoes: bigint;
  erros: bigint;
  cards_com_erro: string[];
}

/**
 * Acertos e erros por conceito, somados do histórico de revisões.
 *
 * SQL cru porque o caminho é revisão → nó do flashcard → aresta DEFINE → nó do
 * conceito → conceito: quatro junções que o agregador do Prisma não expressa numa
 * consulta só. Escopado por `usuarioId` nas duas pontas (revisão e nós).
 * @example query.tallyByConcept('u1')
 */
@Injectable()
export class PrismaConceptReviewTallyQuery implements ConceptReviewTallyQuery {
  constructor(private readonly prisma: PrismaService) {}

  async tallyByConcept(userId: string): Promise<ConceptReviewTally[]> {
    const rows = await this.queryTallies(userId);
    return rows.map(toTally);
  }

  // O caminho é revisão → nó do flashcard → aresta DEFINE → nó do conceito →
  // conceito. Escopado por usuário na sessão E no nó, para uma revisão nunca
  // atravessar para o acervo de outra conta.
  private queryTallies(userId: string): Promise<TallyRow[]> {
    return this.prisma.$queryRaw<TallyRow[]>`
      SELECT c.id AS conceito_id, c.nome AS nome, COUNT(*) AS revisoes,
             SUM(CASE WHEN r.acertou THEN 0 ELSE 1 END) AS erros,
             COALESCE(
               ARRAY_AGG(DISTINCT r.id_flashcard) FILTER (WHERE NOT r.acertou),
               '{}'
             ) AS cards_com_erro
      FROM revisoes_flashcard r
      JOIN sessoes_estudo s ON s.id = r.id_sessao AND s.id_usuario = ${userId}
      JOIN "NodeConhecimento" fn ON fn."referencia_id" = r.id_flashcard
        AND fn."tipoNode" = 'FLASHCARD' AND fn.id_usuario = ${userId}
      JOIN "ConhecimentoAresta" a ON a.id_node_origem = fn.id AND a."tipoRelacao" = 'DEFINE'
      JOIN "NodeConhecimento" cn ON cn.id = a.id_node_destino AND cn."tipoNode" = 'CONCEITO'
      JOIN conceitos c ON c.id = cn."referencia_id"
      GROUP BY c.id, c.nome
    `;
  }
}

// COUNT/SUM do Postgres voltam como bigint pelo driver.
function toTally(row: TallyRow): ConceptReviewTally {
  return {
    conceitoId: row.conceito_id,
    nome: row.nome,
    revisoes: Number(row.revisoes),
    erros: Number(row.erros),
    cardsComErro: row.cards_com_erro ?? [],
  };
}
