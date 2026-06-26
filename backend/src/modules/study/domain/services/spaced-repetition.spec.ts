import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { scheduleCard, dbToState, gradeFromLegacy, type ScheduleState } from './spaced-repetition';

// CHARACTERIZATION tests: capture the current SM-2 behavior before the hexagonal
// refactor. They must not change behavior — only pin it down.
//
// The scheduler applies `fuzz()` (uses Math.random) on intervals >= 3 days.
// Pinning Math.random to 0.5 makes the fuzz delta 0 → fuzz is identity,
// allowing exact interval assertions.

const NOW = new Date('2026-06-22T12:00:00.000Z');
const MIN = 60_000;
const DAY = 86_400_000;
const minLater = (m: number) => new Date(NOW.getTime() + m * MIN);
const dayLater = (d: number) => new Date(NOW.getTime() + d * DAY);

beforeEach(() => {
  vi.spyOn(Math, 'random').mockReturnValue(0.5);
});
afterEach(() => {
  vi.restoreAllMocks();
});

describe('scheduleCard — new card (state = null) → LEARN phase', () => {
  it('again: back to step 0, review in 1 min, difficulty 10', () => {
    const s = scheduleCard('again', null, NOW);
    expect(s).toEqual<ScheduleState>({
      fase: 'LEARN',
      learningStep: 0,
      intervalo: 0,
      fatorEase: 2.5,
      dificuldade: 10,
      proximaRevisao: minLater(1),
      ultimaRevisao: NOW,
    });
  });

  it('hard: repeats the current step (1 min), difficulty 7', () => {
    const s = scheduleCard('hard', null, NOW);
    expect(s).toEqual<ScheduleState>({
      fase: 'LEARN',
      learningStep: 0,
      intervalo: 0,
      fatorEase: 2.5,
      dificuldade: 7,
      proximaRevisao: minLater(1),
      ultimaRevisao: NOW,
    });
  });

  it('good: advances to step 1 (10 min), difficulty 5', () => {
    const s = scheduleCard('good', null, NOW);
    expect(s).toEqual<ScheduleState>({
      fase: 'LEARN',
      learningStep: 1,
      intervalo: 0,
      fatorEase: 2.5,
      dificuldade: 5,
      proximaRevisao: minLater(10),
      ultimaRevisao: NOW,
    });
  });

  it('easy: graduates straight to REVIEW with a 4-day interval, difficulty 1', () => {
    const s = scheduleCard('easy', null, NOW);
    expect(s).toEqual<ScheduleState>({
      fase: 'REVIEW',
      learningStep: 0,
      intervalo: 4,
      fatorEase: 2.5,
      dificuldade: 1,
      proximaRevisao: dayLater(4),
      ultimaRevisao: NOW,
    });
  });
});

describe('scheduleCard — LEARN on the last step graduates with good', () => {
  const learnStep1: ScheduleState = {
    fase: 'LEARN',
    learningStep: 1,
    intervalo: 0,
    fatorEase: 2.5,
    dificuldade: 5,
    proximaRevisao: NOW,
    ultimaRevisao: NOW,
  };

  it('good on step 1 graduates to REVIEW with a 1-day interval', () => {
    const s = scheduleCard('good', learnStep1, NOW);
    expect(s).toEqual<ScheduleState>({
      fase: 'REVIEW',
      learningStep: 0,
      intervalo: 1,
      fatorEase: 2.5,
      dificuldade: 3,
      proximaRevisao: dayLater(1),
      ultimaRevisao: NOW,
    });
  });
});

describe('scheduleCard — REVIEW phase', () => {
  const review: ScheduleState = {
    fase: 'REVIEW',
    learningStep: 0,
    intervalo: 10,
    fatorEase: 2.5,
    dificuldade: 3,
    proximaRevisao: NOW,
    ultimaRevisao: NOW,
  };

  it('again: lapse → RELEARN, ease -0.2, interval *0.2, review in 1 min', () => {
    const s = scheduleCard('again', review, NOW);
    expect(s).toEqual<ScheduleState>({
      fase: 'RELEARN',
      learningStep: 0,
      intervalo: 2,
      fatorEase: 2.3,
      dificuldade: 10,
      proximaRevisao: minLater(1),
      ultimaRevisao: NOW,
    });
  });

  it('hard: ease -0.15, interval = round(10*1.2) = 12', () => {
    const s = scheduleCard('hard', review, NOW);
    expect(s).toEqual<ScheduleState>({
      fase: 'REVIEW',
      learningStep: 0,
      intervalo: 12,
      fatorEase: 2.35,
      dificuldade: 7,
      proximaRevisao: dayLater(12),
      ultimaRevisao: NOW,
    });
  });

  it('good: interval = round(10*ease) = 25, ease unchanged', () => {
    const s = scheduleCard('good', review, NOW);
    expect(s).toEqual<ScheduleState>({
      fase: 'REVIEW',
      learningStep: 0,
      intervalo: 25,
      fatorEase: 2.5,
      dificuldade: 3,
      proximaRevisao: dayLater(25),
      ultimaRevisao: NOW,
    });
  });

  it('easy: ease +0.15, interval = round(10*ease*1.3) = 33', () => {
    const s = scheduleCard('easy', review, NOW);
    expect(s).toEqual<ScheduleState>({
      fase: 'REVIEW',
      learningStep: 0,
      intervalo: 33,
      fatorEase: 2.65,
      dificuldade: 1,
      proximaRevisao: dayLater(33),
      ultimaRevisao: NOW,
    });
  });

  it('ease never drops below MIN_EASE (1.3) with repeated hard', () => {
    const low: ScheduleState = { ...review, fatorEase: 1.35 };
    const s = scheduleCard('hard', low, NOW);
    expect(s.fatorEase).toBe(1.3);
  });
});

describe('scheduleCard — RELEARN phase', () => {
  const relearn: ScheduleState = {
    fase: 'RELEARN',
    learningStep: 0,
    intervalo: 5,
    fatorEase: 2.0,
    dificuldade: 10,
    proximaRevisao: NOW,
    ultimaRevisao: NOW,
  };

  it('again: keeps interval/ease, back to step 0, review in 1 min', () => {
    const s = scheduleCard('again', relearn, NOW);
    expect(s).toEqual<ScheduleState>({
      fase: 'RELEARN',
      learningStep: 0,
      intervalo: 5,
      fatorEase: 2.0,
      dificuldade: 10,
      proximaRevisao: minLater(1),
      ultimaRevisao: NOW,
    });
  });

  it('easy: returns to REVIEW keeping the interval', () => {
    const s = scheduleCard('easy', relearn, NOW);
    expect(s).toEqual<ScheduleState>({
      fase: 'REVIEW',
      learningStep: 0,
      intervalo: 5,
      fatorEase: 2.0,
      dificuldade: 1,
      proximaRevisao: dayLater(5),
      ultimaRevisao: NOW,
    });
  });

  it('good on step 0: advances to step 1 (10 min), stays RELEARN', () => {
    const s = scheduleCard('good', relearn, NOW);
    expect(s).toEqual<ScheduleState>({
      fase: 'RELEARN',
      learningStep: 1,
      intervalo: 5,
      fatorEase: 2.0,
      dificuldade: 3,
      proximaRevisao: minLater(10),
      ultimaRevisao: NOW,
    });
  });

  it('good on the last step graduates back to REVIEW', () => {
    const s = scheduleCard('good', { ...relearn, learningStep: 1 }, NOW);
    expect(s).toEqual<ScheduleState>({
      fase: 'REVIEW',
      learningStep: 0,
      intervalo: 5,
      fatorEase: 2.0,
      dificuldade: 3,
      proximaRevisao: dayLater(5),
      ultimaRevisao: NOW,
    });
  });

  it('hard repeats the current step without advancing', () => {
    const s = scheduleCard('hard', relearn, NOW);
    expect(s.fase).toBe('RELEARN');
    expect(s.learningStep).toBe(0);
    expect(s.proximaRevisao).toEqual(minLater(1));
  });
});

describe('dbToState', () => {
  it('maps the record and applies defaults (fatorEase 2.5, learningStep 0)', () => {
    const s = dbToState({
      fase: 'REVIEW',
      learningStep: undefined as unknown as number,
      intervalo: 7,
      fatorEase: undefined as unknown as number,
      dificuldade: 3,
      proximaRevisao: NOW,
      ultimaRevisao: NOW,
    });
    expect(s).toEqual<ScheduleState>({
      fase: 'REVIEW',
      learningStep: 0,
      intervalo: 7,
      fatorEase: 2.5,
      dificuldade: 3,
      proximaRevisao: NOW,
      ultimaRevisao: NOW,
    });
  });
});

describe('gradeFromLegacy', () => {
  it('not correct → again (regardless of confidence)', () => {
    expect(gradeFromLegacy(false, 5)).toBe('again');
  });
  it('correct with confidence <= 2 → hard', () => {
    expect(gradeFromLegacy(true, 0)).toBe('hard');
    expect(gradeFromLegacy(true, 2)).toBe('hard');
  });
  it('correct with confidence 3-4 → good', () => {
    expect(gradeFromLegacy(true, 3)).toBe('good');
    expect(gradeFromLegacy(true, 4)).toBe('good');
  });
  it('correct with confidence >= 5 → easy', () => {
    expect(gradeFromLegacy(true, 5)).toBe('easy');
  });
});

describe('scheduleCard — interval edges (floor interval+1)', () => {
  const review = (intervalo: number, fatorEase: number): ScheduleState => ({
    fase: 'REVIEW',
    learningStep: 0,
    intervalo,
    fatorEase,
    dificuldade: 3,
    proximaRevisao: NOW,
    ultimaRevisao: NOW,
  });

  it('hard with interval 1: round(1*1.2)=1, but the interval+1 floor guarantees 2', () => {
    const s = scheduleCard('hard', review(1, 2.5), NOW);
    expect(s.intervalo).toBe(2);
  });

  it('good with interval 1 and minimum ease: round(1*1.3)=1, floor guarantees 2', () => {
    const s = scheduleCard('good', review(1, 1.3), NOW);
    expect(s.intervalo).toBe(2);
  });
});

describe('fuzz (via scheduleCard) — applies spread when interval >= 3 days', () => {
  it('with Math.random at the extreme (1.0), good in REVIEW adds the spread: 25 → 26', () => {
    vi.spyOn(Math, 'random').mockReturnValue(1); // delta = +spread (=+1 for 25)
    const review: ScheduleState = {
      fase: 'REVIEW',
      learningStep: 0,
      intervalo: 10,
      fatorEase: 2.5,
      dificuldade: 3,
      proximaRevisao: NOW,
      ultimaRevisao: NOW,
    };
    const s = scheduleCard('good', review, NOW);
    expect(s.intervalo).toBe(26);
  });
});
