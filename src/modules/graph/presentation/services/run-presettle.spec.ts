import { describe, it, expect, vi, beforeEach } from "vitest";
import { runPresettle } from "./run-presettle";
import { presettleLayout } from "./presettle-layout";

// No ambiente de teste (node) não há `Worker` global, então runPresettle deve cair
// no cálculo síncrono. Cobrimos esse fallback — o caminho do worker roda no browser.
vi.mock("./presettle-layout", () => ({
  presettleLayout: vi.fn(() => [{ id: "x", x: 1, y: 2 }]),
}));

beforeEach(() => vi.mocked(presettleLayout).mockClear());

describe("runPresettle (fallback path, no Worker in the env)", () => {
  it("resolves via the synchronous presettle when Worker is unavailable", async () => {
    const result = await runPresettle([] as never, [], {} as never, 10);
    expect(presettleLayout).toHaveBeenCalledWith([], [], {}, 10);
    expect(result).toEqual([{ id: "x", x: 1, y: 2 }]);
  });
});
