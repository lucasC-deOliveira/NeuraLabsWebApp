import { describe, it, expect } from "vitest";
import { normalizeSpeechSettings, MIN_RATE, MAX_RATE } from "./speech-settings";

describe("normalizeSpeechSettings", () => {
  it("keeps valid settings as-is", () => {
    expect(normalizeSpeechSettings({ rate: 1.5, lang: "en-US" })).toEqual({ rate: 1.5, lang: "en-US" });
  });

  it("clamps the rate into the intelligible range", () => {
    expect(normalizeSpeechSettings({ rate: 9, lang: "auto" }).rate).toBe(MAX_RATE);
    expect(normalizeSpeechSettings({ rate: 0.1, lang: "auto" }).rate).toBe(MIN_RATE);
  });

  // Disco corrompido ou versão antiga não deve produzir uma fala quebrada.
  it("falls back to defaults for garbage", () => {
    expect(normalizeSpeechSettings({ rate: "fast", lang: "klingon" })).toEqual({ rate: 1, lang: "auto" });
    expect(normalizeSpeechSettings(null)).toEqual({ rate: 1, lang: "auto" });
    expect(normalizeSpeechSettings(undefined)).toEqual({ rate: 1, lang: "auto" });
  });
});
