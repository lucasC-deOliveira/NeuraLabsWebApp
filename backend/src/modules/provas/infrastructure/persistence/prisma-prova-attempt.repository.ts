import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../../prisma/prisma.service';
import type {
  ProvaAttemptInput,
  ProvaAttemptRepository,
} from '../../domain/ports/prova-attempt-repository';

// Persiste a tentativa e suas respostas numa escrita aninhada (uma transação).
@Injectable()
export class PrismaProvaAttemptRepository implements ProvaAttemptRepository {
  constructor(private readonly prisma: PrismaService) {}

  async save(userId: string, attempt: ProvaAttemptInput): Promise<{ id: string }> {
    return this.prisma.tentativaProva.create({
      data: {
        usuarioId: userId,
        provaId: attempt.provaId,
        acertos: attempt.acertos,
        total: attempt.total,
        tempoTotalMs: attempt.tempoTotalMs,
        respostas: {
          create: attempt.respostas.map((r) => ({
            questaoId: r.questaoId,
            respostaEscolhida: r.respostaEscolhida,
            acertou: r.acertou,
            tempoRespostaMs: r.tempoRespostaMs,
          })),
        },
      },
      select: { id: true },
    });
  }
}
