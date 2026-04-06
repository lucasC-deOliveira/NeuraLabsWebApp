// ==========================================
// SM-2 Spaced Repetition Algorithm
// Pure functions — no database access
// ==========================================

export interface SchedulingResult {
  newInterval: number;
  newEase: number;
  newStage: number;
}

export interface InitialSchedule {
  interval: number;
  ease: number;
  stage: number;
}

/**
 * Core SM-2 algorithm.
 *
 * @param previousEase — ease factor (min 1.3)
 * @param previousInterval — days until next review
 * @param quality — performance score 0–5
 */
export function calculateNextInterval(
  previousEase: number,
  previousInterval: number,
  quality: number,
): SchedulingResult {
  if (quality < 3) {
    return { newInterval: 1, newEase: previousEase, newStage: 0 };
  }

  // SM-2 ease adjustment
  const newEase = Math.max(
    1.3,
    previousEase + (0.1 - (5 - quality) * (0.08 + (5 - quality) * 0.02)),
  );

  // SM-2 interval calculation
  let newInterval: number;
  if (previousInterval === 0) {
    newInterval = 1;
  } else if (previousInterval === 1) {
    newInterval = 6;
  } else {
    newInterval = Math.round(previousInterval * newEase);
  }

  // Stage: 0 = new, 1-5 = learned (capped)
  const newStage = Math.min(5, previousInterval >= 1 ? 5 : 1);

  return { newInterval, newEase, newStage };
}

/**
 * Creates initial schedule for a brand-new card.
 *
 * @param quality — first-review quality 0–5
 */
export function createReviewSchedule(
  quality: number,
): InitialSchedule {
  if (quality < 3) {
    return { interval: 1, ease: 2.5, stage: 0 };
  }

  return { interval: 1, ease: 2.5, stage: 1 };
}

/**
 * Maps a review result to the 0–5 quality score expected by SM-2.
 *
 * acerto=true -> quality = nivelConfianca (1-5)
 * acerto=false -> quality = 0
 */
export function mapQualityToScore(
  acertou: boolean,
  nivelConfianca: number,
): number {
  return acertou ? nivelConfianca : 0;
}
