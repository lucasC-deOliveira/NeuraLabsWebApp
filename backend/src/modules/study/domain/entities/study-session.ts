import type { Grade } from '../value-objects/grade';
import { Review } from './review';

export interface RecordReviewInput {
  flashcardId: string;
  grade: Grade;
  answer?: string;
  responseTimeMs?: number;
}

/**
 * StudySession aggregate root. Groups the reviews answered during a session;
 * its transactional boundary covers the session and the reviews it records.
 */
export class StudySession {
  private readonly _reviews: Review[] = [];

  private constructor(
    readonly id: string,
    readonly userId: string,
  ) {}

  static create(props: { id: string; userId: string }): StudySession {
    return new StudySession(props.id, props.userId);
  }

  get reviews(): readonly Review[] {
    return this._reviews;
  }

  recordReview(input: RecordReviewInput): Review {
    const review = new Review(
      input.flashcardId,
      input.grade,
      input.answer ?? '',
      input.responseTimeMs,
    );
    this._reviews.push(review);
    return review;
  }
}
