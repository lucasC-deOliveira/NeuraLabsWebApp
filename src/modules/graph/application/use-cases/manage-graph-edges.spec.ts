import { describe, it, expect } from "vitest";
import {
  createGraphEdge,
  updateGraphEdge,
  deleteGraphEdge,
  EdgeValidationError,
} from "./manage-graph-edges";
import type { GraphEdgesPort, CreateEdgeData } from "../ports/graph-edges.port";

// Named fake implementing the port (never a stub inline) — mirrors the backend convention.
class FakeGraphEdgesPort implements GraphEdgesPort {
  created: Array<[string, CreateEdgeData]> = [];
  updated: Array<[string, string, { tipoRelacao?: string; peso?: number }]> = [];
  deleted: Array<[string, string]> = [];

  async createEdge(grafoId: string, data: CreateEdgeData): Promise<{ success: boolean; edgeId: string }> {
    this.created.push([grafoId, data]);
    return { success: true, edgeId: "e-new" };
  }
  async updateEdge(
    edgeId: string,
    grafoId: string,
    data: { tipoRelacao?: string; peso?: number },
  ): Promise<{ success: boolean }> {
    this.updated.push([edgeId, grafoId, data]);
    return { success: true };
  }
  async deleteEdge(edgeId: string, grafoId: string): Promise<{ success: boolean }> {
    this.deleted.push([edgeId, grafoId]);
    return { success: true };
  }
}

const validForm = { sourceNodeId: "n1", targetNodeId: "n2", tipoRelacao: "RELACIONADO", peso: 1 };

describe("createGraphEdge", () => {
  it("creates the edge via the port when the form is valid", async () => {
    const port = new FakeGraphEdgesPort();
    await createGraphEdge(port, "g1", validForm);
    expect(port.created).toEqual([["g1", { sourceNodeId: "n1", targetNodeId: "n2", tipoRelacao: "RELACIONADO", peso: 1 }]]);
  });

  it("rejects a self-loop and never hits the port", async () => {
    const port = new FakeGraphEdgesPort();
    await expect(createGraphEdge(port, "g1", { ...validForm, targetNodeId: "n1" })).rejects.toBeInstanceOf(
      EdgeValidationError,
    );
    expect(port.created).toHaveLength(0);
  });
});

describe("updateGraphEdge", () => {
  it("updates when an edge id and relation type are present", async () => {
    const port = new FakeGraphEdgesPort();
    await updateGraphEdge(port, "e1", "g1", validForm);
    expect(port.updated).toEqual([["e1", "g1", { tipoRelacao: "RELACIONADO", peso: 1 }]]);
  });

  it("throws and never hits the port when the edge id is missing", async () => {
    const port = new FakeGraphEdgesPort();
    await expect(updateGraphEdge(port, null, "g1", validForm)).rejects.toBeInstanceOf(EdgeValidationError);
    expect(port.updated).toHaveLength(0);
  });
});

describe("deleteGraphEdge", () => {
  it("deletes the edge via the port", async () => {
    const port = new FakeGraphEdgesPort();
    await deleteGraphEdge(port, "e1", "g1");
    expect(port.deleted).toEqual([["e1", "g1"]]);
  });
});
