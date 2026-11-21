import { describe, expect, it } from "vitest";
import type { LocalSchedule, LocalSrsLog } from "@/lib/srs-local";
import { applyVaultStudySync, pendingVaultReviews, vaultStudySyncBatches } from "./vault-study-sync";

const start = "2026-01-01T12:00:00.000Z";
const reviewedAt = "2026-01-01T12:01:00.000Z";
const end = "2026-01-01T12:02:00.000Z";
const selection = { deckIds: new Set(["linked"]), cardIds: new Set(["card"]) };
const schedule: LocalSchedule = {
  fase: "REVIEW", learningStep: 0, dificuldade: 3, intervalo: 1, fatorEase: 2.5,
  ultimaRevisao: reviewedAt, proximaRevisao: "2026-01-02T12:01:00.000Z",
};

function vaultLog(): LocalSrsLog {
  return {
    schedule: { card: schedule },
    sessions: [{
      id: "session", catalog: true, baralhoId: "linked", startedAt: start, endedAt: end,
      revisoes: [
        { flashcardId: "card", grade: "good", tempoResposta: 500, revisadoEm: reviewedAt },
        { flashcardId: "private-card", grade: "good", tempoResposta: 550, revisadoEm: reviewedAt },
      ],
    }],
  };
}

describe("vault study sync", () => {
  it("sends only selected cards, retaining a stable identifier across retries", () => {
    const log = vaultLog();
    const [batch] = vaultStudySyncBatches(log, selection);
    expect(batch.reviews.map((review) => review.id)).toEqual(["session:0"]);
    expect(batch.cards).toEqual([{ id: "card", knownReviewedAt: reviewedAt }]);
    expect(vaultStudySyncBatches(log, selection)).toEqual([batch]);
  });

  it("uses individual acknowledgments without replacing a still-pending local schedule", () => {
    const log = vaultLog();
    const [batch] = vaultStudySyncBatches(log, selection);
    const remote = { ...schedule, intervalo: 2, proximaRevisao: "2026-01-03T12:01:00.000Z" };
    const changedSchedules = [{ id: "card", schedule: remote }];
    applyVaultStudySync(log, selection, batch, { confirmedReviewIds: ["session:1"], changedSchedules });
    expect(log.schedule.card).toEqual(schedule);
    expect(pendingVaultReviews(log, selection)).toHaveLength(1);

    applyVaultStudySync(log, selection, batch, { confirmedReviewIds: ["session:0"], changedSchedules });
    expect(log.schedule.card).toEqual(remote);
    expect(pendingVaultReviews(log, selection)).toEqual([]);
    expect(log.sessions[0].revisoes[1].serverConfirmed).toBeUndefined();
  });

  it("keeps an in-progress review local until its session is finished", () => {
    const log = vaultLog();
    log.sessions[0].endedAt = null;
    const [batch] = vaultStudySyncBatches(log, selection);
    expect(batch.reviews).toEqual([]);
    applyVaultStudySync(log, selection, batch, {
      confirmedReviewIds: [],
      changedSchedules: [{ id: "card", schedule: { ...schedule, ultimaRevisao: end } }],
    });
    expect(log.schedule.card.ultimaRevisao).toBe(reviewedAt);
  });
});
