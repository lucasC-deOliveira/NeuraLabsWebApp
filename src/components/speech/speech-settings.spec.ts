import { describe, it, expect } from "vitest";
import { normalizeSpeechSettings, MIN_RATE, MAX_RATE, DEFAULT_SPEECH_SETTINGS } from "./speech-settings";
import { DEFAULT_PIPER_VOICE } from "./piper-voices";

describe("normalizeSpeechSettings", () => {
  it("keeps valid settings as-is", () => {
    const valid = { rate: 1.5, lang: "en-US", engine: "piper", voice: "en_US-amy-medium", autoRead: true } as const;
    expect(normalizeSpeechSettings(valid)).toEqual(valid);
  });

  it("clamps the rate into the intelligible range", () => {
    expect(normalizeSpeechSettings({ rate: 9, lang: "auto" }).rate).toBe(MAX_RATE);
    expect(normalizeSpeechSettings({ rate: 0.1, lang: "auto" }).rate).toBe(MIN_RATE);
  });

  // Versão antiga (sem engine/voice) migra para os defaults, sem quebrar.
  it("fills engine/voice defaults for legacy settings", () => {
    expect(normalizeSpeechSettings({ rate: 1.25, lang: "pt-BR" })).toEqual({
      rate: 1.25,
      lang: "pt-BR",
      engine: "system",
      voice: DEFAULT_PIPER_VOICE,
      autoRead: false,
    });
  });

  // Disco corrompido não deve produzir uma fala quebrada.
  it("falls back to defaults for garbage", () => {
    expect(normalizeSpeechSettings({ rate: "fast", lang: "klingon", engine: "x", voice: "nope" })).toEqual(
      DEFAULT_SPEECH_SETTINGS,
    );
    expect(normalizeSpeechSettings(null)).toEqual(DEFAULT_SPEECH_SETTINGS);
    expect(normalizeSpeechSettings(undefined)).toEqual(DEFAULT_SPEECH_SETTINGS);
  });
});
