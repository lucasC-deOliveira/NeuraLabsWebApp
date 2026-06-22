// Phase — the SM-2 lifecycle stage of a card. Value Object: validates on construction.
export type PhaseValue = 'LEARN' | 'REVIEW' | 'RELEARN';

const VALID: readonly PhaseValue[] = ['LEARN', 'REVIEW', 'RELEARN'];

export class Phase {
  private constructor(readonly value: PhaseValue) {}

  static create(value: string): Phase {
    if (!VALID.includes(value as PhaseValue)) {
      throw new Error(`invalid phase: "${value}". Expected: LEARN|REVIEW|RELEARN`);
    }
    return new Phase(value as PhaseValue);
  }

  is(value: PhaseValue): boolean {
    return this.value === value;
  }

  equals(other: Phase): boolean {
    return this.value === other.value;
  }
}
