import { describe, it, expect } from 'vitest';
import { Flashcard } from './flashcard';
import { Grade } from '../value-objects/grade';
import type { ScheduleState } from '../services/spaced-repetition';

const NOW = new Date('2026-06-22T12:00:00.000Z');

describe('Flashcard', () => {
  it('a new card (no learning state) reviewed with good enters LEARN step 1', () => {
    const card = Flashcard.create({ id: 'fc-1', ownerId: 'u1' });

    card.review(Grade.create('good'), NOW);

    expect(card.phase?.value).toBe('LEARN');
    expect(card.learningState?.learningStep).toBe(1);
    expect(card.easeFactor?.value).toBe(2.5);
  });

  it('again on a REVIEW card moves it to RELEARN with ease -0.2', () => {
    const review: ScheduleState = {
      fase: 'REVIEW',
      learningStep: 0,
      intervalo: 10,
      fatorEase: 2.5,
      dificuldade: 3,
      proximaRevisao: NOW,
      ultimaRevisao: NOW,
    };
    const card = Flashcard.create({ id: 'fc-1', ownerId: 'u1', learningState: review });

    card.review(Grade.create('again'), NOW);

    expect(card.phase?.value).toBe('RELEARN');
    expect(card.easeFactor?.value).toBeCloseTo(2.3, 5);
  });

  it('exposes no phase/ease for a brand-new card', () => {
    const card = Flashcard.create({ id: 'fc-1', ownerId: 'u1' });
    expect(card.learningState).toBeNull();
    expect(card.phase).toBeNull();
    expect(card.easeFactor).toBeNull();
  });

  it('isOwnedBy checks the owner', () => {
    const card = Flashcard.create({ id: 'fc-1', ownerId: 'u1' });
    expect(card.isOwnedBy('u1')).toBe(true);
    expect(card.isOwnedBy('u2')).toBe(false);
  });

  describe('reviewAt (offline import)', () => {
    const reviewState = (lastReview: Date): ScheduleState => ({
      fase: 'REVIEW',
      learningStep: 0,
      intervalo: 10,
      fatorEase: 2.5,
      dificuldade: 3,
      proximaRevisao: lastReview,
      ultimaRevisao: lastReview,
    });

    it('reschedules and returns true for a new card', () => {
      const card = Flashcard.create({ id: 'fc-1', ownerId: 'u1' });
      expect(card.reviewAt(Grade.create('good'), NOW)).toBe(true);
      expect(card.phase?.value).toBe('LEARN');
    });

    it('skips (returns false) when the review predates the last one', () => {
      const last = new Date('2026-06-22T12:00:00.000Z');
      const card = Flashcard.create({
        id: 'fc-1',
        ownerId: 'u1',
        learningState: reviewState(last),
      });
      const older = new Date('2026-06-20T12:00:00.000Z');

      expect(card.reviewAt(Grade.create('again'), older)).toBe(false);
      // state unchanged (still REVIEW, ease 2.5)
      expect(card.phase?.value).toBe('REVIEW');
      expect(card.easeFactor?.value).toBe(2.5);
    });

    it('reschedules at exactly the last review time (boundary is strict <)', () => {
      const ts = new Date('2026-06-22T12:00:00.000Z');
      const card = Flashcard.create({ id: 'fc-1', ownerId: 'u1', learningState: reviewState(ts) });
      expect(card.reviewAt(Grade.create('again'), ts)).toBe(true);
    });

    it('reschedules when the review is newer than the last one', () => {
      const last = new Date('2026-06-20T12:00:00.000Z');
      const card = Flashcard.create({
        id: 'fc-1',
        ownerId: 'u1',
        learningState: reviewState(last),
      });
      const newer = new Date('2026-06-22T12:00:00.000Z');

      expect(card.reviewAt(Grade.create('again'), newer)).toBe(true);
      expect(card.phase?.value).toBe('RELEARN');
    });
  });
});
