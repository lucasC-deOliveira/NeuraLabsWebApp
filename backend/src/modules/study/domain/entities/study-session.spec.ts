import { describe, it, expect } from 'vitest';
import { StudySession } from './study-session';
import { Grade } from '../value-objects/grade';

describe('StudySession', () => {
  it('starts with no reviews', () => {
    const session = StudySession.create({ id: 'sess-1', userId: 'u1' });
    expect(session.reviews).toHaveLength(0);
  });

  it('records a review deriving correctness and confidence from the grade', () => {
    const session = StudySession.create({ id: 'sess-1', userId: 'u1' });

    const review = session.recordReview({
      flashcardId: 'fc-1',
      grade: Grade.create('good'),
      answer: 'R',
      responseTimeMs: 1500,
    });

    expect(session.reviews).toHaveLength(1);
    expect(review.flashcardId).toBe('fc-1');
    expect(review.correct).toBe(true);
    expect(review.confidence).toBe(4);
    expect(review.responseTimeMs).toBe(1500);
  });

  it('defaults the answer to an empty string when omitted', () => {
    const session = StudySession.create({ id: 'sess-1', userId: 'u1' });
    const review = session.recordReview({ flashcardId: 'fc-1', grade: Grade.create('again') });
    expect(review.answer).toBe('');
    expect(review.correct).toBe(false);
  });

  it('accumulates multiple reviews in order', () => {
    const session = StudySession.create({ id: 'sess-1', userId: 'u1' });
    session.recordReview({ flashcardId: 'fc-1', grade: Grade.create('good') });
    session.recordReview({ flashcardId: 'fc-2', grade: Grade.create('hard') });
    expect(session.reviews.map((r) => r.flashcardId)).toEqual(['fc-1', 'fc-2']);
  });
});
