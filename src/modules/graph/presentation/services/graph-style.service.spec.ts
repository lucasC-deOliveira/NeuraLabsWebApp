import { describe, it, expect } from "vitest";
import {
  getNodeColors,
  getNodeShape,
  getRelationColor,
  getDominioColor,
  truncateLabel,
  RELATION_COLORS,
} from "./graph-style.service";
import { NODE_TYPE_COLORS } from "../../constants/graph-ui.constants";

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
    expect(getNodeShape("FLASHCARD")).toBe("square");
  });

  it("falls back to rect for unknown type", () => {
    expect(getNodeShape("UNKNOWN")).toBe("rect");
  });

  // Mutação: cada tipo tem uma forma distinta
  it("all five node types have distinct shapes", () => {
    const shapes = ["ASSUNTO", "TOPICO", "CONCEITO", "NOTA", "FLASHCARD"].map(getNodeShape);
    expect(new Set(shapes).size).toBe(5);
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

describe("truncateLabel", () => {
  it("rótulo curto passa intacto", () => {
    expect(truncateLabel("abc", "CONCEITO", 100)).toBe("abc");
  });

  it("rótulo longo é cortado com reticências", () => {
    const out = truncateLabel("a".repeat(60), "CONCEITO", 100);
    expect(out.endsWith("…")).toBe(true);
    expect(out.length).toBeLessThan(60);
  });

  it("nunca devolve string maior que o original", () => {
    const label = "Texto de tamanho médio aqui";
    expect(truncateLabel(label, "FLASHCARD", 96).length).toBeLessThanOrEqual(label.length);
  });

  // Mutação: formas curvas têm menos espaço útil que a caixa
  it("círculo trunca mais cedo que retângulo da mesma largura", () => {
    const label = "x".repeat(40);
    const circle = truncateLabel(label, "ASSUNTO", 120);
    const rect = truncateLabel(label, "CONCEITO", 120);
    expect(circle.length).toBeLessThan(rect.length);
  });

  it("largura maior permite mais caracteres", () => {
    const label = "x".repeat(50);
    const narrow = truncateLabel(label, "CONCEITO", 80);
    const wide = truncateLabel(label, "CONCEITO", 200);
    expect(wide.length).toBeGreaterThan(narrow.length);
  });

  it("mantém pelo menos alguns caracteres mesmo em nós minúsculos", () => {
    const out = truncateLabel("abcdefgh", "CONCEITO", 10);
    expect(out.length).toBeGreaterThanOrEqual(3);
  });
});

// Mutation hardening: pina a aritmética exata (fatores de forma, CHAR_WIDTH,
// LABEL_PADDING, o slice maxChars-1, o Math.max(3) e o limite <=) e os ternários
// dark/light — onde sobreviviam mutantes que só verificações relativas não matam.
describe("graph-style — valores exatos (anti-mutação)", () => {
  it("trunca com a contagem exata por forma na mesma largura (fatores 0.78/0.85/1)", () => {
    // largura 120: CONCEITO usable=108 → 16 chars; TOPICO=90 → 13; ASSUNTO=81.6 → 12.
    // (slice em maxChars-1, depois "…")
    expect(truncateLabel("a".repeat(40), "CONCEITO", 120)).toBe("a".repeat(15) + "…");
    expect(truncateLabel("a".repeat(40), "TOPICO", 120)).toBe("a".repeat(12) + "…");
    expect(truncateLabel("a".repeat(40), "ASSUNTO", 120)).toBe("a".repeat(11) + "…");
  });

  it("respeita o limite <= maxChars (intacto vs cortado em 1 char a mais)", () => {
    // CONCEITO largura 120 → maxChars 16
    expect(truncateLabel("a".repeat(16), "CONCEITO", 120)).toBe("a".repeat(16));
    expect(truncateLabel("a".repeat(17), "CONCEITO", 120)).toBe("a".repeat(15) + "…");
  });

  it("aplica o piso Math.max(3) em nós minúsculos", () => {
    // CONCEITO largura 10 → usable negativo → floor < 3 → maxChars = 3 → slice(0,2)
    expect(truncateLabel("abcdefgh", "CONCEITO", 10)).toBe("ab…");
  });

  it("getNodeColors devolve exatamente a paleta dark/light do tipo", () => {
    expect(getNodeColors("ASSUNTO", true)).toEqual(NODE_TYPE_COLORS.ASSUNTO.dark);
    expect(getNodeColors("ASSUNTO", false)).toEqual(NODE_TYPE_COLORS.ASSUNTO.light);
  });

  it("getRelationColor devolve exatamente o tom dark/light da relação", () => {
    expect(getRelationColor("DEFINE", true)).toBe("#22d3ee");
    expect(getRelationColor("DEFINE", false)).toBe("#0891b2");
  });

  it("getDominioColor cobre o limite > 0 (0 = cinza, 0.0001 = vermelho)", () => {
    expect(getDominioColor(0)).toBe("#71717a");
    expect(getDominioColor(0.0001)).toBe("#ef4444");
  });
});
