// Contadores exibidos no cartão do baralho (Novos / Aprender / Revisar), no espírito
// do app disrupt. Lógica pura: o adapter Prisma traz o agendamento de cada cartão.

// Agendamento SRS do cartão; null quando ele nunca foi estudado.
export interface DeckCardSchedule {
  dificuldade: number;
  proximaRevisao: Date;
}

export interface DeckStats {
  total: number;
  novos: number;
  aprender: number;
  revisar: number;
}

// A partir de 4 (numa escala 1..5) o cartão é tratado como difícil: ainda está sendo
// aprendido, e não apenas revisado.
const HARD_DIFFICULTY = 4;

/**
 * Conta os cartões do baralho por estado: nunca estudados (novos), vencidos e
 * difíceis (aprender) e vencidos e tranquilos (revisar). Cartões em dia não entram
 * em nenhum dos dois últimos — não há o que fazer com eles hoje.
 * @example countDeckStats([null, { dificuldade: 5, proximaRevisao: ontem }], new Date())
 */
export function countDeckStats(cards: (DeckCardSchedule | null)[], now: Date): DeckStats {
  const stats: DeckStats = { total: cards.length, novos: 0, aprender: 0, revisar: 0 };
  for (const card of cards) {
    if (!card) {
      stats.novos++;
      continue;
    }
    if (card.proximaRevisao.getTime() > now.getTime()) continue;
    if (card.dificuldade >= HARD_DIFFICULTY) stats.aprender++;
    else stats.revisar++;
  }
  return stats;
}
