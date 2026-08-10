// SM-2 completo — estilo Anki.
// Mantém ease factor real, etapas de aprendizado, penalidade de lapse e fuzz.
// Domínio puro: sem I/O, sem framework. Determinístico exceto pelo fuzz (random).

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
const GRADUATING_INTERVAL = 1; // dias ao graduar com Good
const EASY_INTERVAL = 4; // dias ao graduar com Easy
export const STARTING_EASE = 2.5;
const EASY_BONUS = 1.3;
const LAPSE_EASE_PENALTY = 0.2;
const LAPSE_INTERVAL_PCT = 0.2; // após lapse, intervalo = round(old * 0.2), mín 1
const HARD_EASE_PENALTY = 0.15;
const EASY_EASE_BONUS = 0.15;
const HARD_INTERVAL_MULT = 1.2;
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
  const delta = Math.round((Math.random() * 2 - 1) * spread); // spread aleatório ±spread
  return Math.max(1, interval + delta);
}

function gradeToDificuldade(grade: ReviewGrade): number {
  return { again: 10, hard: 7, good: 3, easy: 1 }[grade];
}

// Construtores de estado — evitam repetir a montagem do objeto (DRY).
function learnState(
  now: Date,
  fatorEase: number,
  learningStep: number,
  dificuldade: number,
  minutes: number,
): ScheduleState {
  return {
    fase: 'LEARN',
    learningStep,
    intervalo: 0,
    fatorEase,
    dificuldade,
    proximaRevisao: minutesLater(now, minutes),
    ultimaRevisao: now,
  };
}

function reviewState(
  now: Date,
  fatorEase: number,
  intervalo: number,
  dificuldade: number,
): ScheduleState {
  return {
    fase: 'REVIEW',
    learningStep: 0,
    intervalo,
    fatorEase,
    dificuldade,
    proximaRevisao: daysLater(now, intervalo),
    ultimaRevisao: now,
  };
}

// Quantas vezes um card ainda deve ser visto antes da data-alvo. Três é o menor
// número que ainda forma uma curva de esquecimento útil; acima disso o estudo
// vira revisão de coisa já sabida e rouba tempo do conteúdo novo.
export const REVISOES_ANTES_DO_ALVO = 3;

/**
 * Encolhe um intervalo para que ainda caibam REVISOES_ANTES_DO_ALVO revisões
 * antes da data-alvo. Sem data, ou depois que ela passa, devolve o intervalo do
 * SM-2 intacto — o modo prazo não é uma penalidade permanente.
 * @example capIntervalToTarget(30, hoje, daqui12Dias) // 4
 */
export function capIntervalToTarget(intervalo: number, now: Date, dataAlvo: Date | null): number {
  if (!dataAlvo) return intervalo;
  const dias = Math.ceil((dataAlvo.getTime() - now.getTime()) / 86_400_000);
  if (dias <= 0) return intervalo;
  return Math.min(intervalo, Math.max(1, Math.floor(dias / REVISOES_ANTES_DO_ALVO)));
}

// O teto vale só para REVIEW: LEARN e RELEARN contam em minutos e já caem muito
// antes de qualquer prazo — comprimi-los não compraria revisão nenhuma.
function capToTarget(s: ScheduleState, now: Date, dataAlvo: Date | null): ScheduleState {
  if (s.fase !== 'REVIEW') return s;
  const intervalo = capIntervalToTarget(s.intervalo, now, dataAlvo);
  if (intervalo === s.intervalo) return s;
  return { ...s, intervalo, proximaRevisao: daysLater(now, intervalo) };
}

/**
 * Agenda a próxima revisão de um flashcard segundo o SM-2 (estilo Anki).
 *
 * `dataAlvo` é o prazo do plano de estudo: com ele, o intervalo é comprimido para
 * garantir revisões antes da prova. Sem ele (o padrão), o SM-2 é o de sempre.
 * @example scheduleCard('good', null, new Date()) // carta nova → LEARN passo 1
 */
export function scheduleCard(
  grade: ReviewGrade,
  state: ScheduleState | null,
  now: Date,
  dataAlvo: Date | null = null,
): ScheduleState {
  return capToTarget(scheduleBySM2(grade, state, now), now, dataAlvo);
}

function scheduleBySM2(grade: ReviewGrade, state: ScheduleState | null, now: Date): ScheduleState {
  if (!state || state.fase === 'LEARN') return scheduleLearning(grade, state, now);
  if (state.fase === 'RELEARN') return scheduleRelearn(grade, state, now);
  return scheduleReview(grade, state, now);
}

function scheduleLearning(
  grade: ReviewGrade,
  state: ScheduleState | null,
  now: Date,
): ScheduleState {
  const ease = state?.fatorEase ?? STARTING_EASE;
  const step = state?.learningStep ?? 0;
  switch (grade) {
    case 'again':
      return learnState(now, ease, 0, 10, LEARNING_STEPS_MIN[0]);
    case 'easy':
      return reviewState(now, ease, fuzz(EASY_INTERVAL), 1);
    case 'hard':
      return learnState(now, ease, step, 7, LEARNING_STEPS_MIN[step] ?? LEARNING_STEPS_MIN.at(-1)!);
    case 'good':
      return graduateOrAdvance(ease, step, now);
    default:
      throw new Error(`grade inválido: "${grade}". Esperado: again|hard|good|easy`);
  }
}

function graduateOrAdvance(ease: number, step: number, now: Date): ScheduleState {
  const nextStep = step + 1;
  if (nextStep >= LEARNING_STEPS_MIN.length)
    return reviewState(now, ease, fuzz(GRADUATING_INTERVAL), 3);
  return learnState(now, ease, nextStep, 5, LEARNING_STEPS_MIN[nextStep]);
}

function scheduleReview(grade: ReviewGrade, state: ScheduleState, now: Date): ScheduleState {
  if (grade === 'again') return lapseToRelearn(state, now);
  const { fatorEase, base } = nextReviewInterval(grade, state);
  const newInterval = Math.min(MAX_INTERVAL, fuzz(base));
  return reviewState(now, fatorEase, newInterval, gradeToDificuldade(grade));
}

function lapseToRelearn(state: ScheduleState, now: Date): ScheduleState {
  return {
    fase: 'RELEARN',
    learningStep: 0,
    intervalo: Math.max(1, Math.round(state.intervalo * LAPSE_INTERVAL_PCT)),
    fatorEase: Math.max(MIN_EASE, state.fatorEase - LAPSE_EASE_PENALTY),
    dificuldade: 10,
    proximaRevisao: minutesLater(now, LEARNING_STEPS_MIN[0]),
    ultimaRevisao: now,
  };
}

// Calcula novo ease e intervalo-base (antes do fuzz) para hard/good/easy em REVIEW.
function nextReviewInterval(
  grade: ReviewGrade,
  state: ScheduleState,
): { fatorEase: number; base: number } {
  const { fatorEase, intervalo } = state;
  if (grade === 'hard') {
    return {
      fatorEase: Math.max(MIN_EASE, fatorEase - HARD_EASE_PENALTY),
      base: Math.max(intervalo + 1, Math.round(intervalo * HARD_INTERVAL_MULT)),
    };
  }
  if (grade === 'good') {
    return { fatorEase, base: Math.max(intervalo + 1, Math.round(intervalo * fatorEase)) };
  }
  return {
    fatorEase: fatorEase + EASY_EASE_BONUS,
    base: Math.max(intervalo + 1, Math.round(intervalo * fatorEase * EASY_BONUS)),
  };
}

function scheduleRelearn(grade: ReviewGrade, state: ScheduleState, now: Date): ScheduleState {
  if (grade === 'again') return relearnAgain(state, now);
  if (grade === 'easy') return reviewState(now, state.fatorEase, state.intervalo, 1);
  return relearnHardOrGood(grade, state, now);
}

function relearnAgain(state: ScheduleState, now: Date): ScheduleState {
  return {
    ...state,
    learningStep: 0,
    dificuldade: 10,
    proximaRevisao: minutesLater(now, LEARNING_STEPS_MIN[0]),
    ultimaRevisao: now,
  };
}

function relearnHardOrGood(grade: ReviewGrade, state: ScheduleState, now: Date): ScheduleState {
  const nextStep = grade === 'hard' ? state.learningStep : state.learningStep + 1;
  if (nextStep >= LEARNING_STEPS_MIN.length) {
    return reviewState(now, state.fatorEase, state.intervalo, gradeToDificuldade(grade));
  }
  return {
    ...state,
    learningStep: nextStep,
    dificuldade: gradeToDificuldade(grade),
    proximaRevisao: minutesLater(now, LEARNING_STEPS_MIN[nextStep]),
    ultimaRevisao: now,
  };
}

/** Converte um registro do banco (AprendizadoFlashcard) em ScheduleState, aplicando defaults. */
export function dbToState(ap: {
  fase: string;
  learningStep: number;
  intervalo: number;
  fatorEase: number;
  dificuldade: number;
  proximaRevisao: Date;
  ultimaRevisao: Date;
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

/**
 * Deriva o grade a partir de campos legados (sessões antigas, antes dos 4 botões).
 * @example gradeFromLegacy(true, 3) // 'good'
 */
export function gradeFromLegacy(acertou: boolean, nivelConfianca: number): ReviewGrade {
  if (!acertou) return 'again';
  if (nivelConfianca <= 2) return 'hard';
  if (nivelConfianca <= 4) return 'good';
  return 'easy';
}
