import { describe, it, expect } from "vitest";
import { PIPER_VOICES, DEFAULT_PIPER_VOICE, isPiperVoice, piperVoiceLang } from "./piper-voices";

describe("piper voices catalog", () => {
  it("has the default voice in the catalog", () => {
    expect(isPiperVoice(DEFAULT_PIPER_VOICE)).toBe(true);
  });

  it("mirrors the server voice ids exactly (pt_BR/en_US, quality suffix)", () => {
    expect(PIPER_VOICES.map((v) => v.id)).toEqual([
      "pt_BR-faber-medium",
      "pt_BR-cadu-medium",
      "pt_BR-jeff-medium",
      "pt_BR-edresson-low",
      "en_US-amy-medium",
      "en_US-ryan-medium",
    ]);
  });

  it("rejects unknown voices", () => {
    expect(isPiperVoice("pt_BR-nope-medium")).toBe(false);
    expect(isPiperVoice(null)).toBe(false);
  });

  it("resolves a voice's language, falling back to pt-BR", () => {
    expect(piperVoiceLang("en_US-amy-medium")).toBe("en-US");
    expect(piperVoiceLang("pt_BR-faber-medium")).toBe("pt-BR");
    expect(piperVoiceLang("unknown")).toBe("pt-BR");
  });
});
