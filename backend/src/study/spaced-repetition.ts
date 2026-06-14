// SM-2 completo — estilo Anki.
// Mantém ease factor real, etapas de aprendizado, penalidade de lapse e fuzz.

export type ReviewGrade = 'again' | 'hard' | 'good' | 'easy';
export type CardPhase = 'LEARN' | 'REVIEW' | 'RELEARN';

export interface ScheduleState {
  fase: CardPhase;
  learningStep: number;
  intervalo: number;
  fatorEase: number;
  dificuldade: number; // 1-10, usado pelo cálculo de domínio
  proximaRevisao: Date;
  ultimaRevisao: Date;
}

// Etapas de aprendizado em minutos (mesmas do Anki padrão)
const LEARNING_STEPS_MIN = [1, 10];
const GRADUATING_INTERVAL = 1;  // dias ao graduar com Good
const EASY_INTERVAL = 4;        // dias ao graduar com Easy
const STARTING_EASE = 2.5;
const EASY_BONUS = 1.3;
const LAPSE_EASE_PENALTY = 0.2;
const LAPSE_INTERVAL_PCT = 0.2; // após lapse, intervalo = round(old * 0.2), mín 1
const MIN_EASE = 1.3;
const MAX_INTERVAL = 36500;

function minutesLater(base: Date, minutes: number): Date {
  return new Date(base.getTime() + minutes * 60_000);
}

function daysLater(base: Date, days: number): Date {
  return new Date(base.getTime() + days * 86_400_000);
}

function fuzz(interval: number): number {
  if (interval < 3) return interval;
  const spread = Math.max(1, Math.round(interval * 0.05));
  // spread aleatório ±spread
  const delta = Math.round((Math.random() * 2 - 1) * spread);
  return Math.max(1, interval + delta);
}

function gradeToDificuldade(grade: ReviewGrade): number {
  return { again: 10, hard: 7, good: 3, easy: 1 }[grade];
}

// Ponto de entrada principal
export function scheduleCard(
  grade: ReviewGrade,
  state: ScheduleState | null,
  now: Date,
): ScheduleState {
  if (!state || state.fase === 'LEARN') return scheduleLearning(grade, state, now);
  if (state.fase === 'RELEARN') return scheduleRelearn(grade, state, now);
  return scheduleReview(grade, state, now);
}

function scheduleLearning(grade: ReviewGrade, state: ScheduleState | null, now: Date): ScheduleState {
  const ease = state?.fatorEase ?? STARTING_EASE;
  const step = state?.learningStep ?? 0;

  if (grade === 'again') {
    return {
      fase: 'LEARN', learningStep: 0, intervalo: 0, fatorEase: ease,
      dificuldade: 10,
      proximaRevisao: minutesLater(now, LEARNING_STEPS_MIN[0]),
      ultimaRevisao: now,
    };
  }

  if (grade === 'easy') {
    const interval = fuzz(EASY_INTERVAL);
    return {
      fase: 'REVIEW', learningStep: 0, intervalo: interval, fatorEase: ease,
      dificuldade: 1,
      proximaRevisao: daysLater(now, interval),
      ultimaRevisao: now,
    };
  }

  if (grade === 'hard') {
    // Repete a etapa atual
    const stepMin = LEARNING_STEPS_MIN[step] ?? LEARNING_STEPS_MIN[LEARNING_STEPS_MIN.length - 1];
    return {
      fase: 'LEARN', learningStep: step, intervalo: 0, fatorEase: ease,
      dificuldade: 7,
      proximaRevisao: minutesLater(now, stepMin),
      ultimaRevisao: now,
    };
  }

  // good → avança para próxima etapa
  const nextStep = step + 1;
  if (nextStep >= LEARNING_STEPS_MIN.length) {
    // Gradua
    const interval = fuzz(GRADUATING_INTERVAL);
    return {
      fase: 'REVIEW', learningStep: 0, intervalo: interval, fatorEase: ease,
      dificuldade: 3,
      proximaRevisao: daysLater(now, interval),
      ultimaRevisao: now,
    };
  }

  return {
    fase: 'LEARN', learningStep: nextStep, intervalo: 0, fatorEase: ease,
    dificuldade: 5,
    proximaRevisao: minutesLater(now, LEARNING_STEPS_MIN[nextStep]),
    ultimaRevisao: now,
  };
}

function scheduleReview(grade: ReviewGrade, state: ScheduleState, now: Date): ScheduleState {
  const { fatorEase, intervalo } = state;

  if (grade === 'again') {
    const newEase = Math.max(MIN_EASE, fatorEase - LAPSE_EASE_PENALTY);
    const newInterval = Math.max(1, Math.round(intervalo * LAPSE_INTERVAL_PCT));
    return {
      fase: 'RELEARN', learningStep: 0, intervalo: newInterval, fatorEase: newEase,
      dificuldade: 10,
      proximaRevisao: minutesLater(now, LEARNING_STEPS_MIN[0]),
      ultimaRevisao: now,
    };
  }

  let newEase = fatorEase;
  let newInterval: number;

  if (grade === 'hard') {
    newEase = Math.max(MIN_EASE, fatorEase - 0.15);
    newInterval = Math.max(intervalo + 1, Math.round(intervalo * 1.2));
  } else if (grade === 'good') {
    newInterval = Math.max(intervalo + 1, Math.round(intervalo * fatorEase));
  } else {
    // easy
    newEase = fatorEase + 0.15;
    newInterval = Math.max(intervalo + 1, Math.round(intervalo * fatorEase * EASY_BONUS));
  }

  newInterval = Math.min(MAX_INTERVAL, fuzz(newInterval));

  return {
    fase: 'REVIEW', learningStep: 0, intervalo: newInterval, fatorEase: newEase,
    dificuldade: gradeToDificuldade(grade),
    proximaRevisao: daysLater(now, newInterval),
    ultimaRevisao: now,
  };
}

function scheduleRelearn(grade: ReviewGrade, state: ScheduleState, now: Date): ScheduleState {
  const { fatorEase, intervalo } = state;
  const step = state.learningStep;

  if (grade === 'again') {
    return {
      ...state, learningStep: 0, dificuldade: 10,
      proximaRevisao: minutesLater(now, LEARNING_STEPS_MIN[0]),
      ultimaRevisao: now,
    };
  }

  if (grade === 'easy') {
    return {
      fase: 'REVIEW', learningStep: 0, intervalo, fatorEase,
      dificuldade: 1,
      proximaRevisao: daysLater(now, intervalo),
      ultimaRevisao: now,
    };
  }

  // hard repete etapa, good avança
  const nextStep = grade === 'hard' ? step : step + 1;
  if (nextStep >= LEARNING_STEPS_MIN.length) {
    return {
      fase: 'REVIEW', learningStep: 0, intervalo, fatorEase,
      dificuldade: gradeToDificuldade(grade),
      proximaRevisao: daysLater(now, intervalo),
      ultimaRevisao: now,
    };
  }

  return {
    ...state, learningStep: nextStep, dificuldade: gradeToDificuldade(grade),
    proximaRevisao: minutesLater(now, LEARNING_STEPS_MIN[nextStep]),
    ultimaRevisao: now,
  };
}

// Converte registro do banco → ScheduleState
export function dbToState(ap: {
  fase: string; learningStep: number; intervalo: number; fatorEase: number;
  dificuldade: number; proximaRevisao: Date; ultimaRevisao: Date;
}): ScheduleState {
  return {
    fase: (ap.fase as CardPhase) ?? 'LEARN',
    learningStep: ap.learningStep ?? 0,
    intervalo: ap.intervalo,
    fatorEase: ap.fatorEase ?? 2.5,
    dificuldade: ap.dificuldade,
    proximaRevisao: ap.proximaRevisao,
    ultimaRevisao: ap.ultimaRevisao,
  };
}

// Deriva grade de campos legados (compatibilidade com sessões antigas)
export function gradeFromLegacy(acertou: boolean, nivelConfianca: number): ReviewGrade {
  if (!acertou) return 'again';
  if (nivelConfianca <= 2) return 'hard';
  if (nivelConfianca <= 4) return 'good';
  return 'easy';
}
