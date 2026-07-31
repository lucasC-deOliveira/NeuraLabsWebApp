// Núcleo genérico das conquistas: dado um catálogo de marcos (metric → alvo) e os
// sinais atuais do usuário, produz os badges com progresso ("quase lá"). Uma só
// regra, reusada pelos marcos de estudo e pelos de construtor/explorador.
export interface Achievement {
  id: string;
  title: string;
  description: string;
  earned: boolean;
  current: number;
  target: number;
  progress: number;
}

export interface AchievementDef<M extends string> {
  id: string;
  title: string;
  description: string;
  metric: M;
  target: number;
}

/** Avalia os marcos contra os sinais. @example buildAchievements(DEFS, { streak: 4 }) */
export function buildAchievements<M extends string>(
  defs: AchievementDef<M>[],
  signals: Record<M, number>,
): Achievement[] {
  return defs.map((d) => toAchievement(d, signals[d.metric]));
}

function toAchievement<M extends string>(d: AchievementDef<M>, value: number): Achievement {
  return {
    id: d.id,
    title: d.title,
    description: d.description,
    earned: value >= d.target,
    current: Math.min(value, d.target),
    target: d.target,
    progress: Math.min(1, value / d.target),
  };
}
