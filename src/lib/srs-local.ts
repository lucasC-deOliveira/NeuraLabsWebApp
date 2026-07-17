// SRS local (desktop-only). Armazena sessões e revisões em _srs.json no vault.
// Ao fazer Push, as sessões não sincronizadas são enviadas ao backend.
//
// O log vive na RAIZ do vault, não na pasta do grafo. A agenda é do CARD: quando o
// mesmo flashcard aparece em dois grafos — que é o ponto do nó ser do sistema —, um
// log por pasta daria a ele duas agendas SM-2 divergentes, cada uma achando que
// sabe quando você esquece. `readSrsLog` funde o log antigo da pasta na primeira
// leitura, para as agendas já existentes não se perderem.
import { desktop } from "./vault-bridge";

export const SRS_LOG_FILENAME = "_srs.json";

// ---- tipos ----

export type ReviewGrade = 'again' | 'hard' | 'good' | 'easy';
export type CardPhase = 'LEARN' | 'REVIEW' | 'RELEARN';

export interface LocalSchedule {
  fase: CardPhase;
  learningStep: number;
  dificuldade: number;
  intervalo: number;
  fatorEase: number;
  proximaRevisao: string; // ISO
  ultimaRevisao: string;  // ISO
}

export interface LocalRevisao {
  flashcardId: string;
  grade: ReviewGrade;
  tempoResposta: number;
  revisadoEm: string; // ISO
}

export interface LocalSession {
  id: string;
  startedAt: string;
  endedAt: string | null;
  baralhoId: string | null;
  revisoes: LocalRevisao[];
  syncedAt?: string;
}

export interface LocalSrsLog {
  sessions: LocalSession[];
  schedule: Record<string, LocalSchedule>; // flashcardId → schedule atual
}

// ---- leitura / escrita ----

const emptyLog = (): LocalSrsLog => ({ sessions: [], schedule: {} });

async function loadLog(dir: string): Promise<LocalSrsLog | null> {
  try {
    const content = await desktop.vault.readFile(dir, SRS_LOG_FILENAME);
    if (!content) return null;
    const parsed = JSON.parse(content) as LocalSrsLog;
    // migração: garante campos novos nas schedules existentes
    for (const [id, s] of Object.entries(parsed.schedule ?? {})) {
      if (!s.fase) (parsed.schedule[id] as any).fase = 'REVIEW'; // legado = já revisado
      if (s.learningStep == null) parsed.schedule[id].learningStep = 0;
      if (!s.fatorEase) parsed.schedule[id].fatorEase = 2.5;
    }
    return { sessions: parsed.sessions ?? [], schedule: parsed.schedule ?? {} };
  } catch {
    return null;
  }
}

/**
 * Log do vault. `legacyGraphDir` é a pasta de um grafo cujo _srs.json antigo ainda
 * deve ser absorvido — o card manda na agenda, então dois logs viram um.
 * @example readSrsLog(vaultDir, graphDir)
 */
export async function readSrsLog(vaultDir: string, legacyGraphDir?: string): Promise<LocalSrsLog> {
  const raiz = (await loadLog(vaultDir)) ?? emptyLog();
  if (!legacyGraphDir || legacyGraphDir === vaultDir) return raiz;
  const antigo = await loadLog(legacyGraphDir);
  if (!antigo) return raiz;
  const fundido = mergeSrsLogs(raiz, antigo);
  await writeSrsLog(vaultDir, fundido);
  return fundido;
}

/**
 * Funde o log da pasta no da raiz. Em conflito vence a revisão mais RECENTE: ela é
 * a que sabe o que você respondeu por último. Puro.
 * @example mergeSrsLogs(raiz, daPasta)
 */
export function mergeSrsLogs(raiz: LocalSrsLog, antigo: LocalSrsLog): LocalSrsLog {
  const schedule = { ...raiz.schedule };
  for (const [id, s] of Object.entries(antigo.schedule)) {
    const atual = schedule[id];
    if (!atual || new Date(s.ultimaRevisao) > new Date(atual.ultimaRevisao)) schedule[id] = s;
  }
  const conhecidas = new Set(raiz.sessions.map((s) => s.id));
  const sessions = [...raiz.sessions, ...antigo.sessions.filter((s) => !conhecidas.has(s.id))];
  return { sessions, schedule };
}

export async function writeSrsLog(vaultDir: string, log: LocalSrsLog): Promise<void> {
  await desktop.vault.writeFile(vaultDir, SRS_LOG_FILENAME, JSON.stringify(log, null, 2));
}

// ---- verificação de vencimento ----

export function isDue(schedule: LocalSchedule | undefined): boolean {
  if (!schedule) return true;
  return new Date(schedule.proximaRevisao) <= new Date();
}

// Retorna true se o card precisa voltar na mesma sessão (ainda em LEARN/RELEARN)
export function needsRequeue(schedule: LocalSchedule): boolean {
  return schedule.fase === 'LEARN' || schedule.fase === 'RELEARN';
}

// ---- algoritmo SM-2 (igual ao backend/src/study/spaced-repetition.ts) ----

const LEARNING_STEPS_MIN = [1, 10];
const GRADUATING_INTERVAL = 1;
const EASY_INTERVAL = 4;
const STARTING_EASE = 2.5;
const EASY_BONUS = 1.3;
const LAPSE_EASE_PENALTY = 0.2;
const LAPSE_INTERVAL_PCT = 0.2;
const MIN_EASE = 1.3;
const MAX_INTERVAL = 36500;

function minutesLater(base: Date, minutes: number): Date {
  return new Date(base.getTime() + minutes * 60_000);
}

function daysLater(base: Date, days: number): Date {
  return new Date(base.getTime() + days * 86_400_000);
}

// O fuzz espalha os vencimentos para não empilhar tudo no mesmo dia. Ótimo para
// AGENDAR e péssimo para PREVER: quem só quer saber "quanto tempo isto daria?"
// (o rótulo do botão) precisa da mesma resposta sempre, senão o texto dança a
// cada render. Por isso é um parâmetro — ver srs-preview.ts.
export type FuzzFn = (interval: number) => number;

function fuzz(interval: number): number {
  if (interval < 3) return interval;
  const spread = Math.max(1, Math.round(interval * 0.05));
  return Math.max(1, interval + Math.round((Math.random() * 2 - 1) * spread));
}

function gradeToDificuldade(grade: ReviewGrade): number {
  return { again: 10, hard: 7, good: 3, easy: 1 }[grade];
}

export function gradeFromLegacy(acertou: boolean, nivelConfianca: number): ReviewGrade {
  if (!acertou) return 'again';
  if (nivelConfianca <= 2) return 'hard';
  if (nivelConfianca <= 4) return 'good';
  return 'easy';
}

/**
 * Aplica o SM-2: o que este grade faz com este card, agora. Puro — quem grava é
 * submitLocalReview. `fz` permite prever sem o sorteio do fuzz (srs-preview.ts).
 * @example scheduleCard('hard', undefined, new Date()) // card novo → +1 min, LEARN
 */
export function scheduleCard(
  grade: ReviewGrade,
  existing: LocalSchedule | undefined,
  now: Date,
  fz: FuzzFn = fuzz,
): LocalSchedule {
  if (!existing || existing.fase === 'LEARN') return scheduleLearning(grade, existing, now, fz);
  if (existing.fase === 'RELEARN') return scheduleRelearn(grade, existing, now);
  return scheduleReview(grade, existing, now, fz);
}

function scheduleLearning(grade: ReviewGrade, s: LocalSchedule | undefined, now: Date, fz: FuzzFn): LocalSchedule {
  const ease = s?.fatorEase ?? STARTING_EASE;
  const step = s?.learningStep ?? 0;

  if (grade === 'again') return {
    fase: 'LEARN', learningStep: 0, intervalo: 0, fatorEase: ease, dificuldade: 10,
    proximaRevisao: minutesLater(now, LEARNING_STEPS_MIN[0]).toISOString(),
    ultimaRevisao: now.toISOString(),
  };

  if (grade === 'easy') {
    const interval = fz(EASY_INTERVAL);
    return {
      fase: 'REVIEW', learningStep: 0, intervalo: interval, fatorEase: ease, dificuldade: 1,
      proximaRevisao: daysLater(now, interval).toISOString(),
      ultimaRevisao: now.toISOString(),
    };
  }

  if (grade === 'hard') {
    const stepMin = LEARNING_STEPS_MIN[step] ?? LEARNING_STEPS_MIN[LEARNING_STEPS_MIN.length - 1];
    return {
      fase: 'LEARN', learningStep: step, intervalo: 0, fatorEase: ease, dificuldade: 7,
      proximaRevisao: minutesLater(now, stepMin).toISOString(),
      ultimaRevisao: now.toISOString(),
    };
  }

  const nextStep = step + 1;
  if (nextStep >= LEARNING_STEPS_MIN.length) {
    const interval = fz(GRADUATING_INTERVAL);
    return {
      fase: 'REVIEW', learningStep: 0, intervalo: interval, fatorEase: ease, dificuldade: 3,
      proximaRevisao: daysLater(now, interval).toISOString(),
      ultimaRevisao: now.toISOString(),
    };
  }

  return {
    fase: 'LEARN', learningStep: nextStep, intervalo: 0, fatorEase: ease, dificuldade: 5,
    proximaRevisao: minutesLater(now, LEARNING_STEPS_MIN[nextStep]).toISOString(),
    ultimaRevisao: now.toISOString(),
  };
}

function scheduleReview(grade: ReviewGrade, s: LocalSchedule, now: Date, fz: FuzzFn): LocalSchedule {
  const { fatorEase, intervalo } = s;

  if (grade === 'again') {
    const newEase = Math.max(MIN_EASE, fatorEase - LAPSE_EASE_PENALTY);
    const newInterval = Math.max(1, Math.round(intervalo * LAPSE_INTERVAL_PCT));
    return {
      fase: 'RELEARN', learningStep: 0, intervalo: newInterval, fatorEase: newEase, dificuldade: 10,
      proximaRevisao: minutesLater(now, LEARNING_STEPS_MIN[0]).toISOString(),
      ultimaRevisao: now.toISOString(),
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
    newEase = fatorEase + 0.15;
    newInterval = Math.max(intervalo + 1, Math.round(intervalo * fatorEase * EASY_BONUS));
  }

  newInterval = Math.min(MAX_INTERVAL, fz(newInterval));
  return {
    fase: 'REVIEW', learningStep: 0, intervalo: newInterval, fatorEase: newEase,
    dificuldade: gradeToDificuldade(grade),
    proximaRevisao: daysLater(now, newInterval).toISOString(),
    ultimaRevisao: now.toISOString(),
  };
}

function scheduleRelearn(grade: ReviewGrade, s: LocalSchedule, now: Date): LocalSchedule {
  const step = s.learningStep;

  if (grade === 'again') return {
    ...s, learningStep: 0, dificuldade: 10,
    proximaRevisao: minutesLater(now, LEARNING_STEPS_MIN[0]).toISOString(),
    ultimaRevisao: now.toISOString(),
  };

  if (grade === 'easy') return {
    fase: 'REVIEW', learningStep: 0, intervalo: s.intervalo, fatorEase: s.fatorEase, dificuldade: 1,
    proximaRevisao: daysLater(now, s.intervalo).toISOString(),
    ultimaRevisao: now.toISOString(),
  };

  const nextStep = grade === 'hard' ? step : step + 1;
  if (nextStep >= LEARNING_STEPS_MIN.length) return {
    fase: 'REVIEW', learningStep: 0, intervalo: s.intervalo, fatorEase: s.fatorEase,
    dificuldade: gradeToDificuldade(grade),
    proximaRevisao: daysLater(now, s.intervalo).toISOString(),
    ultimaRevisao: now.toISOString(),
  };

  return {
    ...s, learningStep: nextStep, dificuldade: gradeToDificuldade(grade),
    proximaRevisao: minutesLater(now, LEARNING_STEPS_MIN[nextStep]).toISOString(),
    ultimaRevisao: now.toISOString(),
  };
}

// ---- gerenciamento de sessão ----

export async function startLocalSession(graphDir: string, baralhoId: string | null = null): Promise<string> {
  const log = await readSrsLog(graphDir);
  const id = crypto.randomUUID();
  log.sessions.push({ id, startedAt: new Date().toISOString(), endedAt: null, baralhoId, revisoes: [] });
  await writeSrsLog(graphDir, log);
  return id;
}

export async function submitLocalReview(
  graphDir: string,
  sessionId: string,
  review: { flashcardId: string; grade: ReviewGrade; tempoResposta: number },
): Promise<LocalSchedule> {
  const log = await readSrsLog(graphDir);
  const session = log.sessions.find((s) => s.id === sessionId);
  if (!session) throw new Error("Sessão local não encontrada");

  const now = new Date();
  session.revisoes.push({ ...review, revisadoEm: now.toISOString() });
  const newSchedule = scheduleCard(review.grade, log.schedule[review.flashcardId], now);
  log.schedule[review.flashcardId] = newSchedule;
  await writeSrsLog(graphDir, log);
  return newSchedule;
}

export async function finalizeLocalSession(graphDir: string, sessionId: string): Promise<void> {
  const log = await readSrsLog(graphDir);
  const session = log.sessions.find((s) => s.id === sessionId);
  if (!session) return;
  if (session.revisoes.length === 0) {
    log.sessions = log.sessions.filter((s) => s.id !== sessionId);
  } else if (!session.endedAt) {
    session.endedAt = new Date().toISOString();
  }
  await writeSrsLog(graphDir, log);
}
