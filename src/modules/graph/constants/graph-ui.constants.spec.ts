import { describe, it, expect } from "vitest";
import {
  RELATION_LABELS,
  RELATION_GROUPS,
  NODE_TYPE_COLORS,
  NODE_TYPE_DISPLAY,
} from "./graph-ui.constants";

describe("graph-ui constants integrity", () => {
  it("gives every displayed node type a light+dark palette with bg/border/text", () => {
    for (const type of Object.keys(NODE_TYPE_DISPLAY)) {
      const colors = NODE_TYPE_COLORS[type as keyof typeof NODE_TYPE_COLORS];
      expect(colors, `missing colors for ${type}`).toBeDefined();
      for (const theme of ["light", "dark"] as const) {
        expect(colors[theme].bg).toMatch(/^#/);
        expect(colors[theme].border).toMatch(/^#/);
        expect(colors[theme].text).toMatch(/^#/);
      }
    }
  });

  it("has a human label for every relation type used in a group", () => {
    for (const group of RELATION_GROUPS) {
      for (const type of group.types) {
        expect(RELATION_LABELS[type], `missing label for ${type}`).toBeTruthy();
      }
    }
  });

  it("keeps every relation label non-empty", () => {
    for (const [type, label] of Object.entries(RELATION_LABELS)) {
      expect(label, `empty label for ${type}`).not.toBe("");
    }
  });
});
