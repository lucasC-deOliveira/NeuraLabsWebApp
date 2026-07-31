// XP é TEMPERO, não a recompensa: uma pontuação derivada da atividade que já
// medimos (revisões + domínio + ofensiva + criação recente). Consistência e domínio
// são o prêmio real; o XP só enche uma barra que dá sensação de avanço.
export interface XpSignals {
  reviews: number;
  dominated: number;
  streak: number;
  created: number;
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
const XP_PER_CREATED = 3;
// Criar rende XP, mas com TETO: um acervo importado em massa (dezenas de milhares de
// itens) não pode dominar o nível — o XP é tempero e estudar continua sendo o núcleo.
// Para o usuário comum a contribuição é linear; só o outlier bate no teto.
const CREATION_XP_CAP = 1500;
const XP_PER_LEVEL = 100;

/** XP total a partir dos sinais. @example xpFromSignals({ reviews: 120, dominated: 2, streak: 4, created: 8 }) */
export function xpFromSignals(s: XpSignals): number {
  const creationXp = Math.min(s.created * XP_PER_CREATED, CREATION_XP_CAP);
  return (
    s.reviews * XP_PER_REVIEW +
    s.dominated * XP_PER_DOMINATED +
    s.streak * XP_PER_STREAK_DAY +
    creationXp
  );
}

/** Nível e progresso dentro dele. Curva linear (100 XP/nível): previsível e fácil de ler. */
export function levelFromXp(xp: number): XpLevel {
  const level = Math.floor(xp / XP_PER_LEVEL) + 1;
  return { xp, level, xpInLevel: xp % XP_PER_LEVEL, xpForNext: XP_PER_LEVEL };
}
