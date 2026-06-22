// Grade — the four-button SM-2 rating. Value Object: validates on construction.
export type GradeValue = 'again' | 'hard' | 'good' | 'easy';

const VALID: readonly GradeValue[] = ['again', 'hard', 'good', 'easy'];
// Confidence level stored per grade (keeps compatibility with old data).
const CONFIDENCE: Record<GradeValue, number> = { again: 0, hard: 2, good: 4, easy: 5 };

export class Grade {
  private constructor(readonly value: GradeValue) {}

  static create(value: string): Grade {
    if (!VALID.includes(value as GradeValue)) {
      throw new Error(`invalid grade: "${value}". Expected: again|hard|good|easy`);
    }
    return new Grade(value as GradeValue);
  }

  /**
   * Derives a grade from legacy fields (old sessions, before the 4-button grading).
   * @example Grade.fromLegacy(true, 3) // good
   */
  static fromLegacy(correct: boolean, confidence: number): Grade {
    if (!correct) return new Grade('again');
    if (confidence <= 2) return new Grade('hard');
    if (confidence <= 4) return new Grade('good');
    return new Grade('easy');
  }

  get isAgain(): boolean {
    return this.value === 'again';
  }

  get correct(): boolean {
    return !this.isAgain;
  }

  get confidence(): number {
    return CONFIDENCE[this.value];
  }

  equals(other: Grade): boolean {
    return this.value === other.value;
  }
}
