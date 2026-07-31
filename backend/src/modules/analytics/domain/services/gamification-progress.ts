import { evaluateAchievements, type Achievement } from './achievements';
import { levelFromXp, xpFromSignals, type XpSignals } from './xp-level';

// Junta o tempero (XP/nível) com a recompensa real (conquistas de consistência e
// domínio) num único payload para o painel de Progresso.
export interface GamificationProgress {
  xp: number;
  level: number;
  xpInLevel: number;
  xpForNext: number;
  achievements: Achievement[];
}

/** Monta XP/nível + conquistas a partir dos sinais. @example gamificationProgress({ streak: 4, reviews: 120, dominated: 0, created: 8 }) */
export function gamificationProgress(s: XpSignals): GamificationProgress {
  const level = levelFromXp(xpFromSignals(s));
  return { ...level, achievements: evaluateAchievements(s) };
}
