interface MotionBudget {
  nextGain(): number | undefined;
  reheat(): void;
}

/** Gives a settling pass full strength initially, then lowers gain smoothly.
 * @example const pass = createGraphMotionBudget(60)
 */
export function createGraphMotionBudget(steps?: number): MotionBudget {
  let completed = 0;
  return {
    nextGain: (): number | undefined => {
      if (!steps) return 1;
      if (completed >= steps) return undefined;
      const progress = Math.max(0, (completed++ / steps - 0.2) / 0.8);
      return (1 - progress) ** 3;
    },
    reheat: (): void => { completed = 0; },
  };
}
