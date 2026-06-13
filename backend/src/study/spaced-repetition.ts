// Algoritmo SM-2 (funções puras). Igual ao do frontend original.
export interface SchedulingResult { newInterval: number; newEase: number; newStage: number }
export interface InitialSchedule { interval: number; ease: number; stage: number }

export function calculateNextInterval(previousEase: number, previousInterval: number, quality: number): SchedulingResult {
  if (quality < 3) return { newInterval: 1, newEase: previousEase, newStage: 0 };
  const newEase = Math.max(1.3, previousEase + (0.1 - (5 - quality) * (0.08 + (5 - quality) * 0.02)));
  let newInterval: number;
  if (previousInterval === 0) newInterval = 1;
  else if (previousInterval === 1) newInterval = 6;
  else newInterval = Math.round(previousInterval * newEase);
  const newStage = Math.min(5, previousInterval >= 1 ? 5 : 1);
  return { newInterval, newEase, newStage };
}

export function createReviewSchedule(quality: number): InitialSchedule {
  return quality < 3 ? { interval: 1, ease: 2.5, stage: 0 } : { interval: 1, ease: 2.5, stage: 1 };
}

export function mapQualityToScore(acertou: boolean, nivelConfianca: number): number {
  return acertou ? nivelConfianca : 0;
}
