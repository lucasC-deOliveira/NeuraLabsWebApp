import { describe, it, expect } from "vitest";
import { territoryColor, CONQUEST_GOLD } from "./conquest-color";
import { heatmapColor } from "./heatmap-color";

describe("territoryColor", () => {
  it("paints a dominated concept gold, regardless of its raw domain", () => {
    expect(territoryColor(0.1, true)).toBe(CONQUEST_GOLD);
    expect(territoryColor(0.9, true)).toBe(CONQUEST_GOLD);
  });

  it("falls back to the heatmap gradient when not conquered", () => {
    expect(territoryColor(0.3, false)).toBe(heatmapColor(0.3));
    expect(territoryColor(1, false)).toBe(heatmapColor(1));
  });
});
