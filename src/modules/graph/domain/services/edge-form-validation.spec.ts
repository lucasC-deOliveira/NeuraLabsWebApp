import { describe, it, expect } from "vitest";
import { validateNewEdge, validateEditEdge } from "./edge-form-validation";

const base = { sourceNodeId: "n1", targetNodeId: "n2", tipoRelacao: "RELACIONADO", peso: 1 };

describe("validateNewEdge", () => {
  it("requires source, target and relation type", () => {
    expect(validateNewEdge({ ...base, sourceNodeId: "" })).toBe("edge-missing-fields");
    expect(validateNewEdge({ ...base, targetNodeId: "" })).toBe("edge-missing-fields");
    expect(validateNewEdge({ ...base, tipoRelacao: "" })).toBe("edge-missing-fields");
  });

  it("rejects a self-loop (same source and target)", () => {
    expect(validateNewEdge({ ...base, targetNodeId: "n1" })).toBe("edge-same-node");
  });

  it("accepts a valid distinct pair", () => {
    expect(validateNewEdge(base)).toBeNull();
  });
});

describe("validateEditEdge", () => {
  it("requires a selected edge and a relation type", () => {
    expect(validateEditEdge(base, false)).toBe("edge-incomplete");
    expect(validateEditEdge({ ...base, tipoRelacao: "" }, true)).toBe("edge-incomplete");
  });

  it("accepts a selected edge with a relation type", () => {
    expect(validateEditEdge(base, true)).toBeNull();
  });
});
