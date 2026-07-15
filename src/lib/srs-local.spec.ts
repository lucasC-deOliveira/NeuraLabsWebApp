import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

// Mocks devem ser declarados antes dos imports dos módulos que os usam
vi.mock("@/lib/vault-bridge", () => ({
  desktop: {
    vault: {
      readFile: vi.fn(),
      writeFile: vi.fn().mockResolvedValue(undefined),
    },
  },
  isDesktop: vi.fn(() => true),
}));

import { desktop } from "@/lib/vault-bridge";
import {
  isDue,
  needsRequeue,
  gradeFromLegacy,
  readSrsLog,
  startLocalSession,
  submitLocalReview,
  finalizeLocalSession,
  mergeSrsLogs,
  type LocalSrsLog,
  type LocalSchedule,
} from "./srs-local";

// ── helpers ───────────────────────────────────────────────────────────────────

const GRAPH_DIR = "/vault/test-graph";

function isoFuture(daysAhead = 1): string {
  return new Date(Date.now() + daysAhead * 86_400_000).toISOString();
}

function isoPast(daysAgo = 1): string {
  return new Date(Date.now() - daysAgo * 86_400_000).toISOString();
}

function reviewSchedule(overrides: Partial<LocalSchedule> = {}): LocalSchedule {
  return {
    fase: "REVIEW",
    learningStep: 0,
    intervalo: 10,
    fatorEase: 2.5,
    dificuldade: 3,
    proximaRevisao: isoPast(),
    ultimaRevisao: isoPast(2),
    ...overrides,
  };
}

function makeLog(overrides: Partial<LocalSrsLog> = {}): LocalSrsLog {
  return { sessions: [], schedule: {}, ...overrides };
}

function setMockLog(log: LocalSrsLog): void {
  vi.mocked(desktop.vault.readFile).mockResolvedValue(JSON.stringify(log));
}

/** Extrai o log escrito na última chamada a writeFile */
function lastWrittenLog(): LocalSrsLog {
  const calls = vi.mocked(desktop.vault.writeFile).mock.calls;
  const last = calls[calls.length - 1];
  return JSON.parse(last[2] as string) as LocalSrsLog;
}

// ── isDue ─────────────────────────────────────────────────────────────────────

describe("isDue", () => {
  it("schedule undefined → sempre vencido (primeiro uso)", () => {
    expect(isDue(undefined)).toBe(true);
  });

  it("data no passado → vencido", () => {
    const s = reviewSchedule({ proximaRevisao: isoPast() });
    expect(isDue(s)).toBe(true);
  });

  it("data no futuro → ainda não vencido", () => {
    const s = reviewSchedule({ proximaRevisao: isoFuture() });
    expect(isDue(s)).toBe(false);
  });

  it("data exatamente no passado distante → vencido", () => {
    const s = reviewSchedule({ proximaRevisao: "2000-01-01T00:00:00.000Z" });
    expect(isDue(s)).toBe(true);
  });
});

// ── needsRequeue ──────────────────────────────────────────────────────────────

describe("needsRequeue", () => {
  it("LEARN → true (volta para a fila na sessão)", () => {
    expect(needsRequeue({ ...reviewSchedule(), fase: "LEARN" })).toBe(true);
  });

  it("RELEARN → true (reaprendendo, volta para fila)", () => {
    expect(needsRequeue({ ...reviewSchedule(), fase: "RELEARN" })).toBe(true);
  });

  it("REVIEW → false (revisão normal, não volta)", () => {
    expect(needsRequeue({ ...reviewSchedule(), fase: "REVIEW" })).toBe(false);
  });
});

// ── gradeFromLegacy ───────────────────────────────────────────────────────────

describe("gradeFromLegacy", () => {
  it("acertou=false → 'again' independente da confiança", () => {
    expect(gradeFromLegacy(false, 5)).toBe("again");
    expect(gradeFromLegacy(false, 1)).toBe("again");
  });

  it("acertou=true, confiança 1 → 'hard'", () => {
    expect(gradeFromLegacy(true, 1)).toBe("hard");
  });

  it("acertou=true, confiança 2 → 'hard'", () => {
    expect(gradeFromLegacy(true, 2)).toBe("hard");
  });

  it("acertou=true, confiança 3 → 'good'", () => {
    expect(gradeFromLegacy(true, 3)).toBe("good");
  });

  it("acertou=true, confiança 4 → 'good'", () => {
    expect(gradeFromLegacy(true, 4)).toBe("good");
  });

  it("acertou=true, confiança 5 → 'easy'", () => {
    expect(gradeFromLegacy(true, 5)).toBe("easy");
  });

  it("acertou=true, confiança > 4 → 'easy'", () => {
    expect(gradeFromLegacy(true, 10)).toBe("easy");
  });
});

// ── readSrsLog ────────────────────────────────────────────────────────────────

describe("readSrsLog", () => {
  beforeEach(() => vi.clearAllMocks());

  it("arquivo inexistente (null) → log vazio", async () => {
    vi.mocked(desktop.vault.readFile).mockResolvedValue(null as any);
    const log = await readSrsLog(GRAPH_DIR);
    expect(log).toEqual({ sessions: [], schedule: {} });
  });

  it("arquivo vazio (string vazia) → log vazio", async () => {
    vi.mocked(desktop.vault.readFile).mockResolvedValue("");
    const log = await readSrsLog(GRAPH_DIR);
    expect(log).toEqual({ sessions: [], schedule: {} });
  });

  it("falha de leitura (erro) → log vazio sem lançar exceção", async () => {
    vi.mocked(desktop.vault.readFile).mockRejectedValue(new Error("ENOENT"));
    const log = await readSrsLog(GRAPH_DIR);
    expect(log).toEqual({ sessions: [], schedule: {} });
  });

  it("JSON inválido → log vazio sem lançar exceção", async () => {
    vi.mocked(desktop.vault.readFile).mockResolvedValue("{ invalid json }");
    const log = await readSrsLog(GRAPH_DIR);
    expect(log).toEqual({ sessions: [], schedule: {} });
  });

  it("log válido é parseado corretamente", async () => {
    const stored = makeLog({
      sessions: [{ id: "s1", startedAt: "2024-01-01T00:00:00Z", endedAt: null, baralhoId: "d1", revisoes: [] }],
      schedule: { "fc-1": reviewSchedule() },
    });
    vi.mocked(desktop.vault.readFile).mockResolvedValue(JSON.stringify(stored));
    const log = await readSrsLog(GRAPH_DIR);
    expect(log.sessions).toHaveLength(1);
    expect(log.schedule["fc-1"]).toBeDefined();
  });

  it("migração: schedule sem 'fase' recebe fase='REVIEW'", async () => {
    const legacy: any = {
      sessions: [],
      schedule: { "fc-old": { intervalo: 5, fatorEase: 2.5, dificuldade: 3, learningStep: 0, proximaRevisao: isoPast(), ultimaRevisao: isoPast(5) } },
    };
    vi.mocked(desktop.vault.readFile).mockResolvedValue(JSON.stringify(legacy));
    const log = await readSrsLog(GRAPH_DIR);
    expect(log.schedule["fc-old"].fase).toBe("REVIEW");
  });

  it("migração: schedule sem 'learningStep' recebe valor 0", async () => {
    const legacy: any = {
      sessions: [],
      schedule: { "fc-old": { fase: "REVIEW", intervalo: 5, fatorEase: 2.5, dificuldade: 3, proximaRevisao: isoPast(), ultimaRevisao: isoPast(5) } },
    };
    vi.mocked(desktop.vault.readFile).mockResolvedValue(JSON.stringify(legacy));
    const log = await readSrsLog(GRAPH_DIR);
    expect(log.schedule["fc-old"].learningStep).toBe(0);
  });

  it("migração: schedule sem 'fatorEase' recebe valor 2.5", async () => {
    const legacy: any = {
      sessions: [],
      schedule: { "fc-old": { fase: "REVIEW", intervalo: 5, dificuldade: 3, learningStep: 0, proximaRevisao: isoPast(), ultimaRevisao: isoPast(5) } },
    };
    vi.mocked(desktop.vault.readFile).mockResolvedValue(JSON.stringify(legacy));
    const log = await readSrsLog(GRAPH_DIR);
    expect(log.schedule["fc-old"].fatorEase).toBe(2.5);
  });
});

// ── startLocalSession ─────────────────────────────────────────────────────────

describe("startLocalSession", () => {
  beforeEach(() => vi.clearAllMocks());

  it("adiciona uma nova sessão ao log", async () => {
    setMockLog(makeLog());
    await startLocalSession(GRAPH_DIR, "deck-abc");
    const written = lastWrittenLog();
    expect(written.sessions).toHaveLength(1);
  });

  it("nova sessão tem endedAt=null e baralhoId correto", async () => {
    setMockLog(makeLog());
    await startLocalSession(GRAPH_DIR, "deck-abc");
    const { sessions } = lastWrittenLog();
    expect(sessions[0].endedAt).toBeNull();
    expect(sessions[0].baralhoId).toBe("deck-abc");
  });

  it("nova sessão tem revisoes vazio", async () => {
    setMockLog(makeLog());
    await startLocalSession(GRAPH_DIR, null);
    const { sessions } = lastWrittenLog();
    expect(sessions[0].revisoes).toHaveLength(0);
  });

  it("retorna um id de sessão não-vazio", async () => {
    setMockLog(makeLog());
    const id = await startLocalSession(GRAPH_DIR, null);
    expect(typeof id).toBe("string");
    expect(id.length).toBeGreaterThan(0);
  });

  it("cada chamada gera um id de sessão único", async () => {
    setMockLog(makeLog());
    const id1 = await startLocalSession(GRAPH_DIR, null);
    setMockLog(makeLog());
    const id2 = await startLocalSession(GRAPH_DIR, null);
    expect(id1).not.toBe(id2);
  });
});

// ── submitLocalReview — phase LEARN ──────────────────────────────────────────

describe("submitLocalReview — fase LEARN", () => {
  const SESSION_ID = "sess-1";
  beforeEach(() => {
    vi.clearAllMocks();
    vi.spyOn(Math, "random").mockReturnValue(0.5); // fuzz(n) == n
  });
  afterEach(() => vi.restoreAllMocks());

  function withSession(schedule?: LocalSchedule) {
    const log = makeLog({
      sessions: [{ id: SESSION_ID, startedAt: isoPast(), endedAt: null, baralhoId: null, revisoes: [] }],
      schedule: schedule ? { "fc-1": schedule } : {},
    });
    setMockLog(log);
  }

  it("novo card + 'again' → permanece em LEARN no passo 0", async () => {
    withSession();
    const s = await submitLocalReview(GRAPH_DIR, SESSION_ID, { flashcardId: "fc-1", grade: "again", tempoResposta: 500 });
    expect(s.fase).toBe("LEARN");
    expect(s.learningStep).toBe(0);
    expect(s.intervalo).toBe(0);
  });

  it("novo card + 'hard' → permanece em LEARN no passo 0", async () => {
    withSession();
    const s = await submitLocalReview(GRAPH_DIR, SESSION_ID, { flashcardId: "fc-1", grade: "hard", tempoResposta: 500 });
    expect(s.fase).toBe("LEARN");
    expect(s.learningStep).toBe(0);
  });

  it("novo card + 'good' no passo 0 → avança para passo 1 em LEARN", async () => {
    withSession();
    const s = await submitLocalReview(GRAPH_DIR, SESSION_ID, { flashcardId: "fc-1", grade: "good", tempoResposta: 500 });
    expect(s.fase).toBe("LEARN");
    expect(s.learningStep).toBe(1);
  });

  it("LEARN passo 1 + 'good' → gradua para REVIEW", async () => {
    withSession({ fase: "LEARN", learningStep: 1, intervalo: 0, fatorEase: 2.5, dificuldade: 5, proximaRevisao: isoFuture(), ultimaRevisao: isoPast() });
    const s = await submitLocalReview(GRAPH_DIR, SESSION_ID, { flashcardId: "fc-1", grade: "good", tempoResposta: 500 });
    expect(s.fase).toBe("REVIEW");
    expect(s.intervalo).toBeGreaterThan(0);
  });

  it("novo card + 'easy' → gradua diretamente para REVIEW", async () => {
    withSession();
    const s = await submitLocalReview(GRAPH_DIR, SESSION_ID, { flashcardId: "fc-1", grade: "easy", tempoResposta: 500 });
    expect(s.fase).toBe("REVIEW");
    expect(s.intervalo).toBe(4); // EASY_INTERVAL com fuzz(4)=4
  });

  it("revisão é registrada no log da sessão", async () => {
    withSession();
    await submitLocalReview(GRAPH_DIR, SESSION_ID, { flashcardId: "fc-1", grade: "good", tempoResposta: 800 });
    const written = lastWrittenLog();
    const sess = written.sessions.find((s) => s.id === SESSION_ID)!;
    expect(sess.revisoes).toHaveLength(1);
    expect(sess.revisoes[0].flashcardId).toBe("fc-1");
    expect(sess.revisoes[0].grade).toBe("good");
  });

  it("sessão inexistente → lança exceção", async () => {
    setMockLog(makeLog());
    await expect(
      submitLocalReview(GRAPH_DIR, "nao-existe", { flashcardId: "fc-1", grade: "good", tempoResposta: 500 }),
    ).rejects.toThrow("Sessão local não encontrada");
  });
});

// ── submitLocalReview — phase REVIEW ─────────────────────────────────────────

describe("submitLocalReview — fase REVIEW", () => {
  const SESSION_ID = "sess-2";
  beforeEach(() => {
    vi.clearAllMocks();
    vi.spyOn(Math, "random").mockReturnValue(0.5); // fuzz(n) == n
  });
  afterEach(() => vi.restoreAllMocks());

  function withReview(interval: number, ease: number) {
    const log = makeLog({
      sessions: [{ id: SESSION_ID, startedAt: isoPast(), endedAt: null, baralhoId: null, revisoes: [] }],
      schedule: {
        "fc-1": reviewSchedule({ intervalo: interval, fatorEase: ease }),
      },
    });
    setMockLog(log);
  }

  it("'again' → move para RELEARN, ease reduzida", async () => {
    withReview(10, 2.5);
    const s = await submitLocalReview(GRAPH_DIR, SESSION_ID, { flashcardId: "fc-1", grade: "again", tempoResposta: 500 });
    expect(s.fase).toBe("RELEARN");
    expect(s.fatorEase).toBeLessThan(2.5);
    expect(s.learningStep).toBe(0);
  });

  it("'again' → intervalo é 20% do anterior (arredondado), mínimo 1", async () => {
    withReview(10, 2.5);
    const s = await submitLocalReview(GRAPH_DIR, SESSION_ID, { flashcardId: "fc-1", grade: "again", tempoResposta: 500 });
    // max(1, round(10 * 0.2)) = max(1, 2) = 2
    expect(s.intervalo).toBe(2);
  });

  it("'hard' → permanece em REVIEW, ease reduzida 0.15", async () => {
    withReview(10, 2.5);
    const s = await submitLocalReview(GRAPH_DIR, SESSION_ID, { flashcardId: "fc-1", grade: "hard", tempoResposta: 500 });
    expect(s.fase).toBe("REVIEW");
    expect(s.fatorEase).toBeCloseTo(2.35, 2);
  });

  it("'hard' → intervalo cresce pelo menos 1 dia", async () => {
    withReview(10, 2.5);
    const s = await submitLocalReview(GRAPH_DIR, SESSION_ID, { flashcardId: "fc-1", grade: "hard", tempoResposta: 500 });
    expect(s.intervalo).toBeGreaterThan(10);
  });

  it("'good' → permanece em REVIEW, ease inalterada", async () => {
    withReview(10, 2.5);
    const s = await submitLocalReview(GRAPH_DIR, SESSION_ID, { flashcardId: "fc-1", grade: "good", tempoResposta: 500 });
    expect(s.fase).toBe("REVIEW");
    expect(s.fatorEase).toBe(2.5);
  });

  it("'good' → intervalo = max(anterior+1, round(anterior * ease))", async () => {
    withReview(10, 2.5);
    const s = await submitLocalReview(GRAPH_DIR, SESSION_ID, { flashcardId: "fc-1", grade: "good", tempoResposta: 500 });
    // max(11, round(10 * 2.5)) = max(11, 25) = 25; fuzz(25)=25
    expect(s.intervalo).toBe(25);
  });

  it("'easy' → permanece em REVIEW, ease aumenta 0.15", async () => {
    withReview(10, 2.5);
    const s = await submitLocalReview(GRAPH_DIR, SESSION_ID, { flashcardId: "fc-1", grade: "easy", tempoResposta: 500 });
    expect(s.fase).toBe("REVIEW");
    expect(s.fatorEase).toBeCloseTo(2.65, 2);
  });

  it("'easy' → intervalo *= ease * EASY_BONUS (1.3)", async () => {
    withReview(10, 2.5);
    const s = await submitLocalReview(GRAPH_DIR, SESSION_ID, { flashcardId: "fc-1", grade: "easy", tempoResposta: 500 });
    // max(11, round(10 * 2.5 * 1.3)) = max(11, 33) = 33; fuzz(33)=33
    expect(s.intervalo).toBe(33);
  });

  it("ease nunca cai abaixo de MIN_EASE (1.3) mesmo com muitos 'hard'", async () => {
    withReview(10, 1.35); // próximo do mínimo
    const s = await submitLocalReview(GRAPH_DIR, SESSION_ID, { flashcardId: "fc-1", grade: "again", tempoResposta: 500 });
    expect(s.fatorEase).toBeGreaterThanOrEqual(1.3);
  });

  it("intervalo não ultrapassa MAX_INTERVAL (36500 dias)", async () => {
    withReview(36000, 2.5);
    const s = await submitLocalReview(GRAPH_DIR, SESSION_ID, { flashcardId: "fc-1", grade: "easy", tempoResposta: 500 });
    expect(s.intervalo).toBeLessThanOrEqual(36500);
  });

  it("proximaRevisao em REVIEW aponta para o futuro", async () => {
    withReview(10, 2.5);
    const before = Date.now();
    const s = await submitLocalReview(GRAPH_DIR, SESSION_ID, { flashcardId: "fc-1", grade: "good", tempoResposta: 500 });
    const proximo = new Date(s.proximaRevisao).getTime();
    expect(proximo).toBeGreaterThan(before);
  });
});

// ── submitLocalReview — phase RELEARN ────────────────────────────────────────

describe("submitLocalReview — fase RELEARN", () => {
  const SESSION_ID = "sess-3";
  beforeEach(() => {
    vi.clearAllMocks();
    vi.spyOn(Math, "random").mockReturnValue(0.5);
  });
  afterEach(() => vi.restoreAllMocks());

  function withRelearn(step: number, interval = 10, ease = 2.3) {
    const log = makeLog({
      sessions: [{ id: SESSION_ID, startedAt: isoPast(), endedAt: null, baralhoId: null, revisoes: [] }],
      schedule: {
        "fc-1": {
          fase: "RELEARN", learningStep: step, intervalo: interval, fatorEase: ease,
          dificuldade: 10, proximaRevisao: isoPast(), ultimaRevisao: isoPast(2),
        },
      },
    });
    setMockLog(log);
  }

  it("passo 0 + 'again' → permanece em RELEARN no passo 0", async () => {
    withRelearn(0);
    const s = await submitLocalReview(GRAPH_DIR, SESSION_ID, { flashcardId: "fc-1", grade: "again", tempoResposta: 500 });
    expect(s.fase).toBe("RELEARN");
    expect(s.learningStep).toBe(0);
  });

  it("passo 0 + 'easy' → gradua para REVIEW preservando o intervalo anterior", async () => {
    withRelearn(0, 10);
    const s = await submitLocalReview(GRAPH_DIR, SESSION_ID, { flashcardId: "fc-1", grade: "easy", tempoResposta: 500 });
    expect(s.fase).toBe("REVIEW");
    expect(s.intervalo).toBe(10);
  });

  it("passo 0 + 'good' → avança para passo 1 em RELEARN", async () => {
    withRelearn(0);
    const s = await submitLocalReview(GRAPH_DIR, SESSION_ID, { flashcardId: "fc-1", grade: "good", tempoResposta: 500 });
    expect(s.fase).toBe("RELEARN");
    expect(s.learningStep).toBe(1);
  });

  it("passo 1 + 'good' → gradua para REVIEW (último passo)", async () => {
    withRelearn(1);
    const s = await submitLocalReview(GRAPH_DIR, SESSION_ID, { flashcardId: "fc-1", grade: "good", tempoResposta: 500 });
    expect(s.fase).toBe("REVIEW");
  });

  it("passo 0 + 'hard' → permanece em RELEARN no passo 0", async () => {
    withRelearn(0);
    const s = await submitLocalReview(GRAPH_DIR, SESSION_ID, { flashcardId: "fc-1", grade: "hard", tempoResposta: 500 });
    expect(s.fase).toBe("RELEARN");
    expect(s.learningStep).toBe(0);
  });
});

// ── finalizeLocalSession ──────────────────────────────────────────────────────

describe("finalizeLocalSession", () => {
  beforeEach(() => vi.clearAllMocks());

  it("sessão com revisões → recebe endedAt", async () => {
    const log = makeLog({
      sessions: [{
        id: "s1", startedAt: isoPast(), endedAt: null, baralhoId: null,
        revisoes: [{ flashcardId: "fc-1", grade: "good", tempoResposta: 500, revisadoEm: isoPast() }],
      }],
    });
    setMockLog(log);
    await finalizeLocalSession(GRAPH_DIR, "s1");
    const written = lastWrittenLog();
    expect(written.sessions[0].endedAt).not.toBeNull();
  });

  it("sessão sem revisões (abandonada) → removida do log", async () => {
    const log = makeLog({
      sessions: [{ id: "s1", startedAt: isoPast(), endedAt: null, baralhoId: null, revisoes: [] }],
    });
    setMockLog(log);
    await finalizeLocalSession(GRAPH_DIR, "s1");
    const written = lastWrittenLog();
    expect(written.sessions).toHaveLength(0);
  });

  it("sessão inexistente → não lança erro e não escreve nada", async () => {
    const log = makeLog({
      sessions: [{ id: "s1", startedAt: isoPast(), endedAt: null, baralhoId: null, revisoes: [] }],
    });
    setMockLog(log);
    await expect(finalizeLocalSession(GRAPH_DIR, "nao-existe")).resolves.toBeUndefined();
    expect(vi.mocked(desktop.vault.writeFile)).not.toHaveBeenCalled();
  });

  it("sessão já finalizada → endedAt não é sobrescrito", async () => {
    const existingEnd = "2024-06-01T12:00:00.000Z";
    const log = makeLog({
      sessions: [{
        id: "s1", startedAt: isoPast(), endedAt: existingEnd, baralhoId: null,
        revisoes: [{ flashcardId: "fc-1", grade: "good", tempoResposta: 500, revisadoEm: isoPast() }],
      }],
    });
    setMockLog(log);
    await finalizeLocalSession(GRAPH_DIR, "s1");
    const written = lastWrittenLog();
    expect(written.sessions[0].endedAt).toBe(existingEnd);
  });
});

// A agenda é do CARD, não da vista. O log saiu da pasta do grafo para a raiz do
// vault: com o nó do sistema, o mesmo flashcard aparece em vários grafos, e um log
// por pasta lhe daria duas agendas SM-2 divergentes. A fusão existe para as agendas
// que já estão nas pastas não se perderem na mudança.
describe("mergeSrsLogs", () => {
  const schedule = (proxima: string, ultima: string): LocalSchedule => ({
    fase: "REVIEW",
    learningStep: 0,
    dificuldade: 3,
    intervalo: 10,
    fatorEase: 2.5,
    proximaRevisao: proxima,
    ultimaRevisao: ultima,
  });
  const log = (over: Partial<LocalSrsLog> = {}): LocalSrsLog => ({ sessions: [], schedule: {}, ...over });

  it("brings in a card the root does not know yet", () => {
    const fundido = mergeSrsLogs(log(), log({ schedule: { fc1: schedule("2026-08-01", "2026-07-01") } }));
    expect(fundido.schedule.fc1.proximaRevisao).toBe("2026-08-01");
  });

  it("keeps the most RECENT review when both know the card", () => {
    const raiz = log({ schedule: { fc1: schedule("2026-08-01", "2026-07-10") } });
    const antigo = log({ schedule: { fc1: schedule("2026-09-09", "2026-07-15") } });
    // O log da pasta revisou depois: é ele que sabe o que você respondeu por último.
    expect(mergeSrsLogs(raiz, antigo).schedule.fc1.proximaRevisao).toBe("2026-09-09");
  });

  it("does not let an older review overwrite a newer one", () => {
    const raiz = log({ schedule: { fc1: schedule("2026-08-01", "2026-07-20") } });
    const antigo = log({ schedule: { fc1: schedule("2026-09-09", "2026-07-01") } });
    expect(mergeSrsLogs(raiz, antigo).schedule.fc1.proximaRevisao).toBe("2026-08-01");
  });

  it("carries the sessions over without duplicating them", () => {
    const sessao = { id: "s1", startedAt: "2026-07-01", endedAt: null, baralhoId: null, revisoes: [] };
    const raiz = log({ sessions: [sessao] });
    const antigo = log({ sessions: [sessao, { ...sessao, id: "s2" }] });
    expect(mergeSrsLogs(raiz, antigo).sessions.map((s) => s.id)).toEqual(["s1", "s2"]);
  });

  it("has nothing to do when the old log is empty", () => {
    const raiz = log({ schedule: { fc1: schedule("2026-08-01", "2026-07-10") } });
    expect(mergeSrsLogs(raiz, log())).toEqual(raiz);
  });
});
