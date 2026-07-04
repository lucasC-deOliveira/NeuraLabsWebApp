import { describe, it, expect } from "vitest";
import { computeAccuracy, countDueCards, toSubjectSummaries, sessionAccuracy, formatRelativeDate } from "./dashboard-metrics";
import type { StudySessionEntry } from "../dashboard.types";

const NOW = new Date("2026-01-10T12:00:00Z");

function session(over: Partial<StudySessionEntry>): StudySessionEntry {
  return { id: "s", dataInicio: NOW, dataFim: null, totalReviews: 0, correctCount: 0, incorrectCount: 0, avgConfidence: 0, ...over };
}

describe("computeAccuracy", () => {
  it("aggregates correct/total across sessions", () => {
    expect(computeAccuracy([session({ correctCount: 8, totalReviews: 10 }), session({ correctCount: 5, totalReviews: 10 })])).toBe(65);
  });
  it("returns null with no reviews", () => {
    expect(computeAccuracy([session({})])).toBeNull();
  });
});

describe("countDueCards", () => {
  it("counts new cards and past-due cards", () => {
    const cards = [
      { spacedRepetition: null },
      { spacedRepetition: { proximaRevisao: new Date("2026-01-09T12:00:00Z") } },
      { spacedRepetition: { proximaRevisao: new Date("2026-01-20T12:00:00Z") } },
    ];
    expect(countDueCards(cards, NOW)).toBe(2);
  });
});

describe("toSubjectSummaries", () => {
  it("maps topic count", () => {
    expect(toSubjectSummaries([{ id: "a", nome: "Bio", descricao: null, topicos: [{ id: "t", nome: "T" }] }]))
      .toEqual([{ id: "a", nome: "Bio", descricao: null, topicoCount: 1 }]);
  });
});

describe("sessionAccuracy", () => {
  it("computes per-session %", () => {
    expect(sessionAccuracy(session({ correctCount: 3, totalReviews: 4 }))).toBe(75);
    expect(sessionAccuracy(session({}))).toBe(0);
  });
});

describe("formatRelativeDate", () => {
  it("humanizes recency", () => {
    expect(formatRelativeDate(new Date("2026-01-10T11:59:40Z"), NOW)).toBe("agora mesmo");
    expect(formatRelativeDate(new Date("2026-01-10T11:30:00Z"), NOW)).toBe("30 min atrás");
    expect(formatRelativeDate(new Date("2026-01-10T09:00:00Z"), NOW)).toBe("3h atrás");
    expect(formatRelativeDate(new Date("2026-01-08T12:00:00Z"), NOW)).toBe("2 dia(s) atrás");
  });
});
