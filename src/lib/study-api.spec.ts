import { describe, it, expect, vi, beforeEach } from "vitest";
import { apiFetch } from "./api";
import {
  startStudySession,
  submitCardReview,
  endStudySession,
  startDeckStudy,
  getFlashcardForStudy,
  startSingleCardStudy,
  finalizeStudySession,
  syncVaultSessions,
} from "./study-api";

vi.mock("./api", () => ({ apiFetch: vi.fn(() => Promise.resolve("RESULT")) }));
const mockApiFetch = vi.mocked(apiFetch);

beforeEach(() => mockApiFetch.mockClear());

describe("study-api", () => {
  it("starts a study session", async () => {
    await startStudySession();
    expect(mockApiFetch).toHaveBeenCalledWith("/study/session", { method: "POST" });
  });

  it("submits a card review with respostaUsuario appended", async () => {
    await submitCardReview({ flashcardId: "f1", grade: "good", tempoResposta: 5 });
    expect(mockApiFetch).toHaveBeenCalledWith("/study/review", {
      method: "POST",
      body: JSON.stringify({ flashcardId: "f1", grade: "good", tempoResposta: 5, respostaUsuario: "" }),
    });
  });

  it("ends a session by id", async () => {
    await endStudySession("s1");
    expect(mockApiFetch).toHaveBeenCalledWith("/study/session/s1/end", { method: "POST" });
  });

  it("starts a deck study", async () => {
    await startDeckStudy("d1");
    expect(mockApiFetch).toHaveBeenCalledWith("/study/deck/d1", { method: "POST" });
  });

  it("gets a flashcard for study", async () => {
    await getFlashcardForStudy("f1");
    expect(mockApiFetch).toHaveBeenCalledWith("/study/flashcard/f1");
  });

  it("starts a single-card study", async () => {
    await startSingleCardStudy("f1");
    expect(mockApiFetch).toHaveBeenCalledWith("/study/flashcard/f1/start", { method: "POST" });
  });

  it("finalizes a session", async () => {
    await finalizeStudySession("s1");
    expect(mockApiFetch).toHaveBeenCalledWith("/study/session/s1/finalize", { method: "POST" });
  });

  it("syncs vault sessions wrapped in a sessions field", async () => {
    const sessions: Parameters<typeof syncVaultSessions>[0] = [
      { id: "s1", startedAt: "t", endedAt: null, baralhoId: null, revisoes: [] },
    ];
    await syncVaultSessions(sessions);
    expect(mockApiFetch).toHaveBeenCalledWith("/study/sync-vault-log", {
      method: "POST",
      body: JSON.stringify({ sessions }),
    });
  });
});
