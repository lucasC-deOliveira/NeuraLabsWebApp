import { describe, it, expect } from "vitest";
import { heatmapColor } from "./heatmap-color";

describe("heatmapColor", () => {
  it("is red at 0 (não domina) and green at 1 (domina)", () => {
    expect(heatmapColor(0)).toBe("#ef4444");
    expect(heatmapColor(1)).toBe("#22c55e");
  });

  it("is amber in the middle", () => {
    expect(heatmapColor(0.5)).toBe("#f59e0b");
  });

  // Fora de faixa não deve gerar cor inválida (o domínio deveria vir 0..1, mas a
  // borda não confia).
  it("clamps out-of-range values instead of producing garbage hex", () => {
    expect(heatmapColor(-1)).toBe("#ef4444");
    expect(heatmapColor(5)).toBe("#22c55e");
  });

  it("produces a valid 6-digit hex across the range", () => {
    for (const d of [0.1, 0.25, 0.5, 0.75, 0.9]) {
      expect(heatmapColor(d)).toMatch(/^#[0-9a-f]{6}$/);
    }
  });
});
