// XP é TEMPERO, não a recompensa: uma pontuação derivada da atividade que já
// medimos (revisões + domínio + ofensiva). Consistência e domínio são o prêmio
// real; o XP só enche uma barra que dá sensação de avanço a cada estudo.
export interface XpSignals {
  reviews: number;
  dominated: number;
  streak: number;
}

export interface XpLevel {
  xp: number;
  level: number;
  xpInLevel: number;
  xpForNext: number;
}

const XP_PER_REVIEW = 1;
const XP_PER_DOMINATED = 50;
const XP_PER_STREAK_DAY = 5;
const XP_PER_LEVEL = 100;

/** XP total a partir dos sinais. @example xpFromSignals({ reviews: 120, dominated: 2, streak: 4 }) */
export function xpFromSignals(s: XpSignals): number {
  return s.reviews * XP_PER_REVIEW + s.dominated * XP_PER_DOMINATED + s.streak * XP_PER_STREAK_DAY;
}

/** Nível e progresso dentro dele. Curva linear (100 XP/nível): previsível e fácil de ler. */
export function levelFromXp(xp: number): XpLevel {
  const level = Math.floor(xp / XP_PER_LEVEL) + 1;
  return { xp, level, xpInLevel: xp % XP_PER_LEVEL, xpForNext: XP_PER_LEVEL };
}
