import { describe, it, expect } from "vitest";
import { getNodeColors, getRelationColor, getDominioColor } from "./graph-style.service";

describe("getNodeColors", () => {
  it("returns dark colors when isDark=true for known type", () => {
    const colors = getNodeColors("ASSUNTO", true);
    expect(colors).toBeDefined();
    expect(colors).toHaveProperty("bg");
    expect(colors).toHaveProperty("border");
  });

  it("returns light colors when isDark=false for known type", () => {
    const dark = getNodeColors("ASSUNTO", true);
    const light = getNodeColors("ASSUNTO", false);
    // Dark and light palettes must differ
    expect(dark.bg).not.toBe(light.bg);
  });

  it("falls back to CONCEITO palette for unknown type", () => {
    const unknown = getNodeColors("UNKNOWN_TYPE", true);
    const conceito = getNodeColors("CONCEITO", true);
    expect(unknown).toEqual(conceito);
  });

  it("returns defined colors for all standard types", () => {
    for (const type of ["ASSUNTO", "TOPICO", "CONCEITO"]) {
      const colors = getNodeColors(type, false);
      expect(colors).toBeTruthy();
    }
  });
});

describe("getRelationColor", () => {
  it("returns a non-empty string for known relation type in dark mode", () => {
    const color = getRelationColor("DEFINE", true);
    expect(typeof color).toBe("string");
    expect(color.length).toBeGreaterThan(0);
  });

  it("returns different colors for dark and light mode", () => {
    const dark = getRelationColor("GERA", true);
    const light = getRelationColor("GERA", false);
    expect(dark).not.toBe(light);
  });

  it("returns fallback color for unknown relation in dark mode", () => {
    const fallback = getRelationColor("UNKNOWN_REL", true);
    expect(fallback).toBe("#94a3b8");
  });

  it("returns fallback color for unknown relation in light mode", () => {
    const fallback = getRelationColor("UNKNOWN_REL", false);
    expect(fallback).toBe("#64748b");
  });

  // Mutation: verify that dark and light fallbacks are distinct
  it("dark and light fallbacks are different values", () => {
    expect(getRelationColor("NONE", true)).not.toBe(getRelationColor("NONE", false));
  });
});

describe("getDominioColor", () => {
  it("returns green for dominio >= 0.7", () => {
    expect(getDominioColor(0.7)).toBe("#22c55e");
    expect(getDominioColor(1.0)).toBe("#22c55e");
  });

  it("returns yellow for dominio between 0.4 and 0.69", () => {
    expect(getDominioColor(0.4)).toBe("#eab308");
    expect(getDominioColor(0.69)).toBe("#eab308");
  });

  it("returns red for dominio > 0 and < 0.4", () => {
    expect(getDominioColor(0.1)).toBe("#ef4444");
    expect(getDominioColor(0.39)).toBe("#ef4444");
  });

  it("returns grey for dominio === 0", () => {
    expect(getDominioColor(0)).toBe("#71717a");
  });

  // Mutation: boundary between yellow and green
  it("boundary 0.7 is green, 0.699 is yellow", () => {
    expect(getDominioColor(0.7)).toBe("#22c55e");
    expect(getDominioColor(0.699)).toBe("#eab308");
  });
});
