import type { Grade } from '../value-objects/grade';

/**
 * A single answer given to a flashcard within a study session. Part of the
 * StudySession aggregate. Derives correctness and confidence from the grade.
 */
export class Review {
  constructor(
    readonly flashcardId: string,
    readonly grade: Grade,
    readonly answer: string,
    readonly responseTimeMs?: number,
  ) {}

  get correct(): boolean {
    return this.grade.correct;
  }

  get confidence(): number {
    return this.grade.confidence;
  }
}
