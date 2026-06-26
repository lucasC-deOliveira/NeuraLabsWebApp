import { scheduleCard, type ScheduleState } from '../services/spaced-repetition';
import { EaseFactor } from '../value-objects/ease-factor';
import { Grade } from '../value-objects/grade';
import { Phase } from '../value-objects/phase';

export interface FlashcardProps {
  id: string;
  ownerId: string;
  learningState?: ScheduleState | null;
}

/**
 * Flashcard aggregate root. Owns its scheduling state (Aprendizado) and the
 * behavior to review it; the SM-2 calculation lives in the domain service.
 */
export class Flashcard {
  private constructor(
    readonly id: string,
    readonly ownerId: string,
    private state: ScheduleState | null,
  ) {}

  static create(props: FlashcardProps): Flashcard {
    return new Flashcard(props.id, props.ownerId, props.learningState ?? null);
  }

  get learningState(): ScheduleState | null {
    return this.state;
  }

  // The current lifecycle phase, or null for a card never reviewed.
  get phase(): Phase | null {
    return this.state ? Phase.create(this.state.fase) : null;
  }

  // The current ease factor, or null for a card never reviewed.
  get easeFactor(): EaseFactor | null {
    return this.state ? EaseFactor.clamped(this.state.fatorEase) : null;
  }

  isOwnedBy(userId: string): boolean {
    return this.ownerId === userId;
  }

  /**
   * Reviews the card with the given grade, rescheduling it via SM-2 (Anki-style).
   * @example flashcard.review(Grade.create('good'), new Date())
   */
  review(grade: Grade, now: Date): void {
    this.state = scheduleCard(grade.value, this.state, now);
  }

  /**
   * Reviews the card as of a past timestamp (offline import). Skips rescheduling
   * when the review predates the last recorded one. Returns whether it rescheduled.
   * @example flashcard.reviewAt(Grade.create('good'), reviewedAt)
   */
  reviewAt(grade: Grade, reviewedAt: Date): boolean {
    if (this.state && reviewedAt < this.state.ultimaRevisao) return false;
    this.state = scheduleCard(grade.value, this.state, reviewedAt);
    return true;
  }
}
