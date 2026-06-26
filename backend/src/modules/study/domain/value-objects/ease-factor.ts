// EaseFactor — the SM-2 ease multiplier. Value Object: never drops below MIN.
const MIN_EASE = 1.3;

export class EaseFactor {
  static readonly MIN = MIN_EASE;

  private constructor(readonly value: number) {}

  static create(value: number): EaseFactor {
    if (!Number.isFinite(value) || value < MIN_EASE) {
      throw new Error(`invalid ease factor: "${value}". Expected: a finite number >= ${MIN_EASE}`);
    }
    return new EaseFactor(value);
  }

  // Clamps to the minimum allowed ease (SM-2 never lets ease fall below MIN).
  static clamped(value: number): EaseFactor {
    return new EaseFactor(Math.max(MIN_EASE, value));
  }

  equals(other: EaseFactor): boolean {
    return this.value === other.value;
  }
}
