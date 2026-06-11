import { describe, it, expect } from "vitest";
import {
  getNodeColors,
  getNodeShape,
  getRelationColor,
  getDominioColor,
  RELATION_COLORS,
} from "./graph-style.service";

describe("RELATION_COLORS", () => {
  it("toda relação tem cor única na paleta clara", () => {
    const lights = Object.values(RELATION_COLORS).map((c) => c.light);
    expect(new Set(lights).size).toBe(lights.length);
  });

  it("toda relação tem cor única na paleta escura", () => {
    const darks = Object.values(RELATION_COLORS).map((c) => c.dark);
    expect(new Set(darks).size).toBe(darks.length);
  });

  it("cobre todas as relações das regras de relacionamento", () => {
    const ruleRelations = [
      "DEFINE", "EXPLICA", "APROFUNDA", "EXEMPLIFICA", "CONTRASTA", "SINTETIZA", "ALERTA_ERRO",
      "IS_A", "PART_OF", "PREREQUISITO", "DERIVA_DE", "EVOLUI_PARA", "REFORCA", "ALTERNATIVA_A",
      "CONTRASTA_COM", "CONFUNDE_COM", "ANTI_PADRAO_DE", "MEDIDO_POR", "OBJETIVO_DE",
      "PERTENCE_A", "FUNDAMENTA", "APLICADO_EM",
      "SUBTOPICO_DE", "RELACIONADO", "DEPENDE_DE",
      "HERDA",
    ];
    for (const rel of ruleRelations) {
      expect(RELATION_COLORS[rel], `falta cor para ${rel}`).toBeDefined();
    }
  });

  it("cores claras e escuras diferem para cada relação", () => {
    for (const [rel, c] of Object.entries(RELATION_COLORS)) {
      expect(c.light, `light===dark em ${rel}`).not.toBe(c.dark);
    }
  });
});

describe("getNodeShape", () => {
  it("maps each node type to its shape", () => {
    expect(getNodeShape("ASSUNTO")).toBe("circle");
    expect(getNodeShape("TOPICO")).toBe("ellipse");
    expect(getNodeShape("CONCEITO")).toBe("rect");
    expect(getNodeShape("NOTA")).toBe("rect-vertical");
    expect(getNodeShape("FLASHCARD")).toBe("rect-vertical");
  });

  it("falls back to rect for unknown type", () => {
    expect(getNodeShape("UNKNOWN")).toBe("rect");
  });

  // Mutação: notas e flashcards compartilham o retângulo vertical;
  // as demais formas são distintas entre si
  it("uses 4 distinct shapes across the five node types", () => {
    const shapes = ["ASSUNTO", "TOPICO", "CONCEITO", "NOTA", "FLASHCARD"].map(getNodeShape);
    expect(new Set(shapes).size).toBe(4);
    expect(getNodeShape("NOTA")).toBe(getNodeShape("FLASHCARD"));
  });
});

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
