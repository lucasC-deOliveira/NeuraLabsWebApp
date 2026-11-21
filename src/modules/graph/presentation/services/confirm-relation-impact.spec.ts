import { describe, expect, it, vi } from "vitest";
import { confirmRelationImpact } from "./confirm-relation-impact";

describe("confirmRelationImpact", () => {
  it("does not authorize deletion if another view starts sharing the relation after confirmation", async () => {
    const ask = vi.fn().mockResolvedValue(true);
    const loadImpact = vi.fn()
      .mockResolvedValueOnce([{ id: "g1", name: "Biology" }])
      .mockResolvedValueOnce([{ id: "g1", name: "Biology" }, { id: "g2", name: "Review" }]);
    await expect(confirmRelationImpact({
      operation: "delete", currentGraphId: "g1", edge: { source: "a", target: "b" }, loadImpact, ask,
    })).rejects.toThrow("afetados mudaram");
  });
});
