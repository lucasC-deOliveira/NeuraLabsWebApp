// Session statistics for the study flow (pure derivations).

export interface SessionStats {
  totalCards: number;
  correctCount: number;
  incorrectCount: number;
  startTime: Date;
  endTime?: Date;
}

/** Milliseconds → "mm:ss" (zero-padded). */
export function formatDuration(ms: number): string {
  const totalSeconds = Math.floor(ms / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes.toString().padStart(2, "0")}:${seconds.toString().padStart(2, "0")}`;
}

/** Percentage of correct answers over the total, rounded; 0 when no cards. */
export function computeAccuracy(correctCount: number, totalCards: number): number {
  if (totalCards <= 0) return 0;
  return Math.round((correctCount / totalCards) * 100);
}
