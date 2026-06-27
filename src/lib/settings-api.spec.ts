import { describe, it, expect, vi, beforeEach } from "vitest";
import { apiFetch } from "./api";
import { getConfigAI, saveConfigAI, type ConfigAIData } from "./settings-api";

vi.mock("./api", () => ({ apiFetch: vi.fn(() => Promise.resolve("RESULT")) }));
const mockApiFetch = vi.mocked(apiFetch);

beforeEach(() => mockApiFetch.mockClear());

const config: ConfigAIData = { apiKey: "k", baseUrl: "https://api", modelo: "gpt" };

describe("settings-api", () => {
  it("gets the AI config", async () => {
    await getConfigAI();
    expect(mockApiFetch).toHaveBeenCalledWith("/settings/ai");
  });

  it("saves the AI config with a PUT body", async () => {
    await saveConfigAI(config);
    expect(mockApiFetch).toHaveBeenCalledWith("/settings/ai", {
      method: "PUT",
      body: JSON.stringify(config),
    });
  });
});
