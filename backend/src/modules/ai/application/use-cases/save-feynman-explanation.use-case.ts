import { nextFeynmanReview } from '../../domain/services/feynman-schedule';
import type { FeynmanAlvoTipo } from '../../domain/ports/feynman-context-source';
import type { FeynmanStore } from '../../domain/ports/feynman-store';
import type { FeynmanNotePublisher } from '../../domain/ports/feynman-note-publisher';

export interface SaveFeynmanInput {
  texto: string;
  clareza: number;
  lacunas: unknown;
  jargao: unknown;
}

/**
 * Persiste uma tentativa de explicação Feynman (histórico → analytics), agenda a
 * próxima re-explicação (SM-2-lite pela clareza) e a publica como NOTA no grafo para
 * ela renderizar imediatamente ao lado do alvo.
 * @example save.execute('u1', 'CONCEITO', 'c1', { texto, clareza: 72, lacunas, jargao })
 */
export class SaveFeynmanExplanationUseCase {
  constructor(
    private readonly store: FeynmanStore,
    private readonly notes: FeynmanNotePublisher,
  ) {}

  async execute(
    userId: string,
    alvoTipo: FeynmanAlvoTipo,
    alvoId: string,
    input: SaveFeynmanInput,
  ): Promise<void> {
    await this.store.saveAttempt({ userId, alvoTipo, alvoId, ...input });
    const intervaloAtual = await this.store.currentInterval(userId, alvoTipo, alvoId);
    const schedule = nextFeynmanReview(input.clareza, intervaloAtual, new Date());
    await this.store.upsertState({
      userId,
      alvoTipo,
      alvoId,
      ultimaClareza: input.clareza,
      intervalo: schedule.intervalo,
      proximaRevisao: schedule.proximaRevisao,
    });
    await this.notes.publish({ userId, alvoTipo, alvoId, texto: input.texto });
  }
}
