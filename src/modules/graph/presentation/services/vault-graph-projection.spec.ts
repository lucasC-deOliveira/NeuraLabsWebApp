import { describe, expect, it } from "vitest";
import { keepEquivalentVaultProjection } from "./vault-graph-projection";

describe("vault graph projection", () => {
  it("keeps the same view when a vault write only changes content outside the canvas", () => {
    const current = [{ id: "a", label: "Concept", type: "CONCEITO", posicaoX: undefined }];
    const refreshed = [{ id: "a", type: "CONCEITO", label: "Concept" }];
    expect(keepEquivalentVaultProjection(current, refreshed)).toBe(current);
  });

  it("publishes a new view when the edited label changes", () => {
    const current = [{ id: "a", label: "Before" }];
    const refreshed = [{ id: "a", label: "After" }];
    expect(keepEquivalentVaultProjection(current, refreshed)).toBe(refreshed);
  });
});
