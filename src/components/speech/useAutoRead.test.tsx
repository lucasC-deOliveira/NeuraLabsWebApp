import { describe, it, expect, vi } from "vitest";
import { renderHook } from "@testing-library/react";
import { useAutoRead } from "./useAutoRead";
import type { SpeechControls } from "./useSpeech";

function fakeSpeech(): SpeechControls {
  return { supported: true, speakingId: null, toggle: vi.fn(), stop: vi.fn(), speak: vi.fn() };
}

const card = { id: "c1", pergunta: "P1", resposta: "R1" };

describe("useAutoRead", () => {
  it("reads the question when entering a card (enabled)", () => {
    const speech = fakeSpeech();
    renderHook(({ phase }) => useAutoRead(speech, card, phase, true), {
      initialProps: { phase: "question" },
    });
    expect(speech.speak).toHaveBeenCalledWith("pergunta", "P1");
  });

  it("reads the answer when the phase flips to answer", () => {
    const speech = fakeSpeech();
    const { rerender } = renderHook(({ phase }) => useAutoRead(speech, card, phase, true), {
      initialProps: { phase: "question" },
    });
    (speech.speak as ReturnType<typeof vi.fn>).mockClear();
    rerender({ phase: "answer" });
    expect(speech.speak).toHaveBeenCalledWith("resposta", "R1");
  });

  it("does nothing when disabled", () => {
    const speech = fakeSpeech();
    renderHook(() => useAutoRead(speech, card, "question", false));
    expect(speech.speak).not.toHaveBeenCalled();
  });

  it("does not re-read on re-render of the same card+phase", () => {
    const speech = fakeSpeech();
    const { rerender } = renderHook(({ phase }) => useAutoRead(speech, card, phase, true), {
      initialProps: { phase: "question" },
    });
    (speech.speak as ReturnType<typeof vi.fn>).mockClear();
    rerender({ phase: "question" });
    expect(speech.speak).not.toHaveBeenCalled();
  });
});
