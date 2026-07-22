import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useSpeech } from "./useSpeech";

const spoken: { text: string; lang: string }[] = [];

class FakeUtterance {
  text: string;
  lang = "";
  rate = 1;
  onend: (() => void) | null = null;
  onerror: (() => void) | null = null;
  constructor(text: string) {
    this.text = text;
  }
}

beforeEach(() => {
  spoken.length = 0;
  localStorage.clear(); // defaults: engine "system", lang "auto"
  vi.stubGlobal("SpeechSynthesisUtterance", FakeUtterance);
  vi.stubGlobal("speechSynthesis", {
    speak: (u: FakeUtterance) => {
      spoken.push({ text: u.text, lang: u.lang });
      queueMicrotask(() => u.onend?.()); // avança a fila de trechos/frases
    },
    cancel: () => {},
  });
});

afterEach(() => vi.unstubAllGlobals());

const flush = (): Promise<void> => new Promise((r) => setTimeout(r, 0));

describe("useSpeech mixed-language reading (system engine, auto)", () => {
  it("speaks an English tech term in English and the rest in Portuguese", async () => {
    const { result } = renderHook(() => useSpeech());
    await act(async () => {
      result.current.speak("q", "heap como funciona");
      for (let i = 0; i < 5; i++) await flush();
    });
    expect(spoken).toEqual([
      { text: "heap ", lang: "en-US" },
      { text: "como funciona", lang: "pt-BR" },
    ]);
  });
});
