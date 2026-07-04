import { describe, it, expect } from "vitest";
import { resolveAiConfig, validateAiConfig, DEFAULT_AI_CONFIG } from "./ai-config";

describe("resolveAiConfig", () => {
  it("returns the loaded config when present", () => {
    const loaded = { apiKey: "sk", baseUrl: "http://api", modelo: "gpt-4o" };
    expect(resolveAiConfig(loaded)).toEqual(loaded);
  });

  it("falls back to defaults when nothing is saved", () => {
    expect(resolveAiConfig(null)).toEqual(DEFAULT_AI_CONFIG);
  });
});

describe("validateAiConfig", () => {
  it("requires an API key", () => {
    expect(validateAiConfig("")).toBe("A API key e obrigatoria.");
    expect(validateAiConfig("   ")).toBe("A API key e obrigatoria.");
  });

  it("accepts a non-empty API key", () => {
    expect(validateAiConfig("sk-secret")).toBeNull();
  });
});
