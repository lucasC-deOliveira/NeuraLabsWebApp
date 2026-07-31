// Conquistas: marcos de CONSISTÊNCIA (ofensiva) e DOMÍNIO (conceitos dominados) —
// a recompensa que o usuário pediu. Cada marco carrega o progresso atual para a UI
// mostrar "quase lá", não só o selo aceso. Os títulos/descrições vão à UI (PT).
export interface AchievementSignals {
  streak: number;
  reviews: number;
  dominated: number;
}

export interface Achievement {
  id: string;
  title: string;
  description: string;
  earned: boolean;
  current: number;
  target: number;
  progress: number;
}

type Metric = keyof AchievementSignals;

interface AchievementDef {
  id: string;
  title: string;
  description: string;
  metric: Metric;
  target: number;
}

const DEFS: AchievementDef[] = [
  {
    id: 'streak-3',
    title: 'Aquecendo',
    description: '3 dias seguidos estudando',
    metric: 'streak',
    target: 3,
  },
  {
    id: 'streak-7',
    title: 'Semana cheia',
    description: '7 dias seguidos estudando',
    metric: 'streak',
    target: 7,
  },
  {
    id: 'streak-14',
    title: 'Duas semanas',
    description: '14 dias seguidos estudando',
    metric: 'streak',
    target: 14,
  },
  {
    id: 'streak-30',
    title: 'Hábito de aço',
    description: '30 dias seguidos estudando',
    metric: 'streak',
    target: 30,
  },
  {
    id: 'reviews-100',
    title: 'Centena',
    description: '100 revisões feitas',
    metric: 'reviews',
    target: 100,
  },
  {
    id: 'reviews-500',
    title: 'Meio milhar',
    description: '500 revisões feitas',
    metric: 'reviews',
    target: 500,
  },
  {
    id: 'reviews-1000',
    title: 'Milhar',
    description: '1000 revisões feitas',
    metric: 'reviews',
    target: 1000,
  },
  {
    id: 'dominated-1',
    title: 'Primeiro domínio',
    description: '1 conceito dominado',
    metric: 'dominated',
    target: 1,
  },
  {
    id: 'dominated-5',
    title: 'Cinco domínios',
    description: '5 conceitos dominados',
    metric: 'dominated',
    target: 5,
  },
  {
    id: 'dominated-25',
    title: 'Território vasto',
    description: '25 conceitos dominados',
    metric: 'dominated',
    target: 25,
  },
];

/** Avalia todas as conquistas contra os sinais atuais. @example evaluateAchievements({ streak: 4, reviews: 120, dominated: 0 }) */
export function evaluateAchievements(s: AchievementSignals): Achievement[] {
  return DEFS.map((d) => toAchievement(d, s[d.metric]));
}

function toAchievement(d: AchievementDef, value: number): Achievement {
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
