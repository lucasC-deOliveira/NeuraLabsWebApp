import { describe, expect, it } from "vitest";
import type { VaultStudySyncRequest, VaultStudySyncResponse } from "@contracts/vault-study-sync";
import type { LocalSrsLog } from "@/lib/srs-local";
import type { VaultDeck } from "../domain/vault-library";
import { pendingLocalStudyNotice, probeVaultSchedules } from "./vault-study-notice";

class FakeScheduleProbeServer {
  readonly requests: VaultStudySyncRequest[] = [];

  readonly request = async (batch: VaultStudySyncRequest): Promise<VaultStudySyncResponse> => {
    this.requests.push(batch);
    return {
      confirmedReviewIds: [],
      changedSchedules: [{
        id: "card", schedule: {
          fase: "REVIEW", learningStep: 0, dificuldade: 3, intervalo: 1, fatorEase: 2.5,
          ultimaRevisao: "2026-01-02T12:00:00Z", proximaRevisao: "2026-01-03T12:00:00Z",
        },
      }],
    };
  };
}

describe("probeVaultSchedules", () => {
  it("checks selected server schedules without sending pending reviews or modifying the vault log", async () => {
    const server = new FakeScheduleProbeServer();
    const log: LocalSrsLog = {
      schedule: {},
      sessions: [{
        id: "session", baralhoId: "deck", startedAt: "2026-01-01T12:00:00Z", endedAt: "2026-01-01T12:02:00Z",
        revisoes: [{ flashcardId: "card", grade: "good", tempoResposta: 100, revisadoEm: "2026-01-01T12:01:00Z" }],
      }],
    };
    const selected = { deckIds: new Set(["deck"]), cardIds: new Set(["card"]) };
    const changes = await probeVaultSchedules(log, selected, server.request);
    expect(server.requests).toEqual([{ cards: [{ id: "card", knownReviewedAt: null }], reviews: [] }]);
    expect(changes.map(({ id }) => id)).toEqual(["card"]);
    expect(log.schedule).toEqual({});
    expect(log.sessions[0].revisoes[0].serverConfirmed).toBeUndefined();
  });
});

describe("pendingLocalStudyNotice", () => {
  const scope = { folder: "vault", accountId: "account", serverUrl: "/api" };
  const legacyDownload: VaultDeck = {
    id: "c1234567890abcdefghijklmn",
    title: "Downloaded deck",
    cards: [{ id: "card", question: "Question", answer: "Answer", schedule: null }],
  };
  const log: LocalSrsLog = {
    schedule: {},
    sessions: [{
      id: "session", baralhoId: legacyDownload.id, catalog: true,
      startedAt: "2026-01-01T12:00:00Z", endedAt: "2026-01-01T12:02:00Z",
      revisoes: [{ flashcardId: "card", grade: "good", tempoResposta: 100, revisadoEm: "2026-01-01T12:01:00Z" }],
    }],
  };
  const unlinked = { deckIds: new Set<string>(), cardIds: new Set<string>() };

  it("offers to link an older downloaded deck after its local study session closes", () => {
    expect(pendingLocalStudyNotice(log, unlinked, [legacyDownload], scope)).toMatchObject({
      kind: "unlinked-reviews", deckId: legacyDownload.id, count: 1, ...scope,
    });
  });

  it("does not offer to upload a local-only deck or a download from another account", () => {
    const local = { ...legacyDownload, id: "3a7a1bdb-b3de-4d97-8592-29f000e27a08" };
    const other = { ...legacyDownload, downloadedFrom: { ...scope, accountId: "other" } };
    expect(pendingLocalStudyNotice(log, unlinked, [local, other], scope)).toBeNull();
  });
});
