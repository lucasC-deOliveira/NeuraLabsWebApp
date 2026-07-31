import { evaluateAchievements, type Achievement, type AchievementSignals } from './achievements';
import { levelFromXp, xpFromSignals } from './xp-level';

// Junta o tempero (XP/nível) com a recompensa real (conquistas de consistência e
// domínio) num único payload para o painel de Progresso.
export interface GamificationProgress {
  xp: number;
  level: number;
  xpInLevel: number;
  xpForNext: number;
  achievements: Achievement[];
}

/** Monta XP/nível + conquistas a partir dos sinais. @example gamificationProgress({ streak: 4, reviews: 120, dominated: 0 }) */
export function gamificationProgress(s: AchievementSignals): GamificationProgress {
  const level = levelFromXp(xpFromSignals(s));
  return { ...level, achievements: evaluateAchievements(s) };
}
