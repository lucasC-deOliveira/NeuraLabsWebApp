import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { scheduleCard, dbToState, gradeFromLegacy, type ScheduleState } from './spaced-repetition';

// Testes de CARACTERIZAÇÃO: capturam o comportamento atual do SM-2 antes da
// refatoração para hexagonal. Não devem mudar o comportamento — só travá-lo.
//
// O scheduler aplica `fuzz()` (usa Math.random) em intervalos >= 3 dias.
// Fixando Math.random em 0.5, o delta do fuzz vira 0 → fuzz é identidade,
// permitindo asserir intervalos exatos.

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

describe('scheduleCard — carta nova (state = null) → fase LEARN', () => {
  it('again: volta ao passo 0, revisão em 1 min, dificuldade 10', () => {
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

  it('hard: repete o passo atual (1 min), dificuldade 7', () => {
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

  it('good: avança para o passo 1 (10 min), dificuldade 5', () => {
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

  it('easy: gradua direto para REVIEW com intervalo de 4 dias, dificuldade 1', () => {
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

describe('scheduleCard — LEARN no último passo gradua com good', () => {
  const learnStep1: ScheduleState = {
    fase: 'LEARN',
    learningStep: 1,
    intervalo: 0,
    fatorEase: 2.5,
    dificuldade: 5,
    proximaRevisao: NOW,
    ultimaRevisao: NOW,
  };

  it('good no passo 1 gradua para REVIEW com intervalo 1 dia', () => {
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

describe('scheduleCard — fase REVIEW', () => {
  const review: ScheduleState = {
    fase: 'REVIEW',
    learningStep: 0,
    intervalo: 10,
    fatorEase: 2.5,
    dificuldade: 3,
    proximaRevisao: NOW,
    ultimaRevisao: NOW,
  };

  it('again: lapso → RELEARN, ease -0.2, intervalo *0.2, revisão em 1 min', () => {
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

  it('hard: ease -0.15, intervalo = round(10*1.2) = 12', () => {
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

  it('good: intervalo = round(10*ease) = 25, ease inalterado', () => {
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

  it('easy: ease +0.15, intervalo = round(10*ease*1.3) = 33', () => {
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

  it('ease nunca cai abaixo de MIN_EASE (1.3) com hard repetido', () => {
    const low: ScheduleState = { ...review, fatorEase: 1.35 };
    const s = scheduleCard('hard', low, NOW);
    expect(s.fatorEase).toBe(1.3);
  });
});

describe('scheduleCard — fase RELEARN', () => {
  const relearn: ScheduleState = {
    fase: 'RELEARN',
    learningStep: 0,
    intervalo: 5,
    fatorEase: 2.0,
    dificuldade: 10,
    proximaRevisao: NOW,
    ultimaRevisao: NOW,
  };

  it('again: mantém intervalo/ease, volta ao passo 0, revisão em 1 min', () => {
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

  it('easy: volta para REVIEW mantendo o intervalo', () => {
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

  it('good no passo 0: avança para passo 1 (10 min), continua RELEARN', () => {
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

  it('good no último passo gradua de volta para REVIEW', () => {
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

  it('hard repete o passo atual sem avançar', () => {
    const s = scheduleCard('hard', relearn, NOW);
    expect(s.fase).toBe('RELEARN');
    expect(s.learningStep).toBe(0);
    expect(s.proximaRevisao).toEqual(minLater(1));
  });
});

describe('dbToState', () => {
  it('mapeia o registro e aplica defaults (fatorEase 2.5, learningStep 0)', () => {
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
  it('não acertou → again (independente da confiança)', () => {
    expect(gradeFromLegacy(false, 5)).toBe('again');
  });
  it('acertou com confiança <= 2 → hard', () => {
    expect(gradeFromLegacy(true, 0)).toBe('hard');
    expect(gradeFromLegacy(true, 2)).toBe('hard');
  });
  it('acertou com confiança 3-4 → good', () => {
    expect(gradeFromLegacy(true, 3)).toBe('good');
    expect(gradeFromLegacy(true, 4)).toBe('good');
  });
  it('acertou com confiança >= 5 → easy', () => {
    expect(gradeFromLegacy(true, 5)).toBe('easy');
  });
});

describe('scheduleCard — bordas de intervalo (piso intervalo+1)', () => {
  const review = (intervalo: number, fatorEase: number): ScheduleState => ({
    fase: 'REVIEW',
    learningStep: 0,
    intervalo,
    fatorEase,
    dificuldade: 3,
    proximaRevisao: NOW,
    ultimaRevisao: NOW,
  });

  it('hard com intervalo 1: round(1*1.2)=1, mas o piso intervalo+1 garante 2', () => {
    const s = scheduleCard('hard', review(1, 2.5), NOW);
    expect(s.intervalo).toBe(2);
  });

  it('good com intervalo 1 e ease mínimo: round(1*1.3)=1, piso garante 2', () => {
    const s = scheduleCard('good', review(1, 1.3), NOW);
    expect(s.intervalo).toBe(2);
  });
});

describe('fuzz (via scheduleCard) — aplica spread quando intervalo >= 3 dias', () => {
  it('com Math.random no extremo (1.0), good em REVIEW soma o spread: 25 → 26', () => {
    vi.spyOn(Math, 'random').mockReturnValue(1); // delta = +spread (=+1 para 25)
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
