import { nextFeynmanReview } from '../../domain/services/feynman-schedule';
import { composeFeynmanNote } from '../../domain/services/feynman-note';
import { feynmanAnguloLabel, type FeynmanAngulo } from '../../domain/services/feynman-angulo';
import type { FeynmanAlvoTipo } from '../../domain/ports/feynman-context-source';
import type { FeynmanStore } from '../../domain/ports/feynman-store';
import type { FeynmanNotePublisher } from '../../domain/ports/feynman-note-publisher';

export interface FeynmanSessionExplanation {
  angulo: FeynmanAngulo;
  texto: string;
  clareza: number;
  lacunas: unknown;
  jargao: unknown;
}

/**
 * Salva uma sessão da Técnica Feynman: as explicações de vários ângulos do mesmo alvo.
 * Grava cada ângulo como tentativa (histórico → analytics), agenda a re-explicação pela
 * clareza do ÂNGULO MAIS FRACO (o elo fraco define o domínio) e publica a nota do grafo
 * combinando os ângulos numa nota só.
 * @example save.execute('u1', 'CONCEITO', 'c1', [{ angulo: 'SIMPLES', texto, clareza: 80, ... }])
 */
export class SaveFeynmanSessionUseCase {
  constructor(
    private readonly store: FeynmanStore,
    private readonly notes: FeynmanNotePublisher,
  ) {}

  async execute(
    userId: string,
    alvoTipo: FeynmanAlvoTipo,
    alvoId: string,
    explicacoes: FeynmanSessionExplanation[],
  ): Promise<void> {
    if (explicacoes.length === 0) return;
    for (const e of explicacoes) await this.saveOne(userId, alvoTipo, alvoId, e);
    const overall = Math.min(...explicacoes.map((e) => e.clareza));
    await this.reschedule(userId, alvoTipo, alvoId, overall);
    await this.publishNote(userId, alvoTipo, alvoId, explicacoes);
  }

  private saveOne(
    userId: string,
    alvoTipo: FeynmanAlvoTipo,
    alvoId: string,
    e: FeynmanSessionExplanation,
  ): Promise<void> {
    return this.store.saveAttempt({
      userId,
      alvoTipo,
      alvoId,
      texto: e.texto,
      clareza: e.clareza,
      lacunas: e.lacunas,
      jargao: e.jargao,
      angulo: e.angulo,
    });
  }

  private async reschedule(
    userId: string,
    alvoTipo: FeynmanAlvoTipo,
    alvoId: string,
    clareza: number,
  ): Promise<void> {
    const intervaloAtual = await this.store.currentInterval(userId, alvoTipo, alvoId);
    const schedule = nextFeynmanReview(clareza, intervaloAtual, new Date());
    await this.store.upsertState({
      userId,
      alvoTipo,
      alvoId,
      ultimaClareza: clareza,
      intervalo: schedule.intervalo,
      proximaRevisao: schedule.proximaRevisao,
    });
  }

  private publishNote(
    userId: string,
    alvoTipo: FeynmanAlvoTipo,
    alvoId: string,
    explicacoes: FeynmanSessionExplanation[],
  ): Promise<void> {
    const texto = composeFeynmanNote(
      explicacoes.map((e) => ({ titulo: feynmanAnguloLabel(e.angulo), texto: e.texto })),
    );
    return this.notes.publish({ userId, alvoTipo, alvoId, texto });
  }
}
