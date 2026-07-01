import { describe, it, expect, vi } from "vitest";
import { updateNode, NodeValidationError, buildNodeUpdatePayload } from "./update-node";
import type { GraphNodesPort } from "../ports/graph-nodes.port";

// Named fake implementing the port (never a stub inline) — mirrors the backend convention.
class FakeGraphNodesPort implements GraphNodesPort {
  updateCalls: Array<[string, string, Record<string, unknown>, string]> = [];
  getNodeDetails = vi.fn();
  async updateGraphNode(
    group: string,
    nodeId: string,
    data: Record<string, unknown>,
    grafoId: string,
  ): Promise<{ success: boolean }> {
    this.updateCalls.push([group, nodeId, data, grafoId]);
    return { success: true };
  }
}

describe("updateNode", () => {
  it("calls the port with the built payload and grafoId when valid", async () => {
    const port = new FakeGraphNodesPort();
    await updateNode(port, {
      grafoId: "g1",
      group: "CONCEITO",
      nodeId: "n1",
      fields: { nome: "Meiose", descricao: "" },
    });
    expect(port.updateCalls).toHaveLength(1);
    const [group, nodeId, data, grafoId] = port.updateCalls[0];
    expect([group, nodeId, grafoId]).toEqual(["CONCEITO", "n1", "g1"]);
    expect(data).toMatchObject({ nome: "Meiose", descricao: null });
  });

  it("throws NodeValidationError with the domain code and never hits the port when invalid", async () => {
    const port = new FakeGraphNodesPort();
    await expect(
      updateNode(port, { grafoId: "g1", group: "CONCEITO", nodeId: "n1", fields: { nome: "" } }),
    ).rejects.toBeInstanceOf(NodeValidationError);
    expect(port.updateCalls).toHaveLength(0);
  });
});

describe("buildNodeUpdatePayload", () => {
  it("trims values and nulls empty descricao/fonte", () => {
    const payload = buildNodeUpdatePayload({ nome: " x ", descricao: "  ", fonte: "" });
    expect(payload.nome).toBe("x");
    expect(payload.descricao).toBeNull();
    expect(payload.fonte).toBeNull();
  });
});
