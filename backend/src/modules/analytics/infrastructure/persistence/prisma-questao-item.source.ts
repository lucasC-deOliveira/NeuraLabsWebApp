import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../../prisma/prisma.service';
import type {
  QuestaoAnswerRow,
  QuestaoItemMeta,
  QuestaoItemSource,
} from '../../domain/ports/questao-item-source';

interface RawAnswer {
  acertou: boolean;
  respostaEscolhida: string;
  tentativa: { dataInicio: Date };
}
function toAnswerRow(row: RawAnswer): QuestaoAnswerRow {
  return { data: row.tentativa.dataInicio, acertou: row.acertou, escolhida: row.respostaEscolhida };
}

// Read-model adapter dos analytics de UMA questão (respostas nas tentativas).
@Injectable()
export class PrismaQuestaoItemSource implements QuestaoItemSource {
  constructor(private readonly prisma: PrismaService) {}

  async questionAnswers(userId: string, questaoId: string): Promise<QuestaoAnswerRow[]> {
    const rows = await this.prisma.respostaQuestao.findMany({
      where: { questaoId, tentativa: { usuarioId: userId } },
      select: {
        acertou: true,
        respostaEscolhida: true,
        tentativa: { select: { dataInicio: true } },
      },
    });
    return rows.map(toAnswerRow);
  }

  async questionMeta(userId: string, questaoId: string): Promise<QuestaoItemMeta | null> {
    const questao = await this.prisma.questao.findFirst({
      where: { id: questaoId, usuarioId: userId },
      select: { enunciado: true, gabarito: true },
    });
    return questao ? { enunciado: questao.enunciado, gabarito: questao.gabarito } : null;
  }
}
