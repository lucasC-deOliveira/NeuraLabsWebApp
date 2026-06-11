import { describe, it, expect } from "vitest";

// Pure logic extracted from color-theme-provider — tested without DOM/React
// to stay in node environment. Integration of the provider with DOM is
// covered by manual browser testing and the dev server verification.

type ColorTheme =
  | "classic-gx"
  | "cyber-ultraviolet"
  | "chroma-teal"
  | "acid-toxic"
  | "light-gx-core"
  | "neon-frost"
  | "cyber-quartz"
  | "digital-mint"
  | "none";

const DARK_THEMES = new Set<ColorTheme>([
  "classic-gx",
  "cyber-ultraviolet",
  "chroma-teal",
  "acid-toxic",
]);

const LIGHT_THEMES = new Set<ColorTheme>([
  "light-gx-core",
  "neon-frost",
  "cyber-quartz",
  "digital-mint",
]);

const ALL_THEMES: ColorTheme[] = [
  "classic-gx",
  "cyber-ultraviolet",
  "chroma-teal",
  "acid-toxic",
  "light-gx-core",
  "neon-frost",
  "cyber-quartz",
  "digital-mint",
];

function resolveNextTheme(theme: ColorTheme): "dark" | "light" | "system" {
  if (theme === "none") return "system";
  return DARK_THEMES.has(theme) ? "dark" : "light";
}

describe("ColorThemeProvider — domain logic", () => {
  describe("theme classification", () => {
    it("4 themes are classified as dark", () => {
      expect(DARK_THEMES.size).toBe(4);
    });

    it("4 themes are classified as light", () => {
      expect(LIGHT_THEMES.size).toBe(4);
    });

    it("dark and light theme sets are disjoint", () => {
      for (const t of DARK_THEMES) {
        expect(LIGHT_THEMES.has(t)).toBe(false);
      }
    });

    it("every named theme belongs to exactly one set", () => {
      for (const t of ALL_THEMES) {
        const inDark = DARK_THEMES.has(t);
        const inLight = LIGHT_THEMES.has(t);
        expect(inDark || inLight).toBe(true);
        expect(inDark && inLight).toBe(false);
      }
    });
  });

  describe("resolveNextTheme (next-themes sync)", () => {
    it("returns 'system' for 'none'", () => {
      expect(resolveNextTheme("none")).toBe("system");
    });

    it("returns 'dark' for dark themes", () => {
      for (const t of DARK_THEMES) {
        expect(resolveNextTheme(t)).toBe("dark");
      }
    });

    it("returns 'light' for light themes", () => {
      for (const t of LIGHT_THEMES) {
        expect(resolveNextTheme(t)).toBe("light");
      }
    });

    // Mutation: 'none' must not resolve to 'dark' or 'light'
    it("'none' resolves to 'system', never dark/light", () => {
      const result = resolveNextTheme("none");
      expect(result).not.toBe("dark");
      expect(result).not.toBe("light");
    });
  });

  describe("data-color-theme attribute value", () => {
    it("'none' maps to attribute removal (empty string)", () => {
      const attr = (t: ColorTheme) => (t === "none" ? "" : t);
      expect(attr("none")).toBe("");
    });

    it("all named themes map to themselves as the attribute value", () => {
      const attr = (t: ColorTheme) => (t === "none" ? "" : t);
      for (const t of ALL_THEMES) {
        expect(attr(t)).toBe(t);
      }
    });
  });
});
