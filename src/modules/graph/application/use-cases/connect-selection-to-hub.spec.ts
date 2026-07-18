import { describe, expect, it } from "vitest";
import { connectSelectionToHub } from "./connect-selection-to-hub";
import type { CreateEdgeData, GraphEdgesPort } from "../ports/graph-edges.port";

const edge = (sourceNodeId: string) => ({
  sourceNodeId,
  targetNodeId: "hub",
  tipoRelacao: "PERTENCE_A",
});

class FakeGraphEdgesPort implements GraphEdgesPort {
  public created: CreateEdgeData[] = [];
  constructor(private readonly rejectSources: string[] = []) {}

  createEdge(_grafoId: string, data: CreateEdgeData): Promise<{ success: boolean; edgeId: string }> {
    if (this.rejectSources.includes(data.sourceNodeId)) {
      return Promise.reject(new Error("aresta duplicada"));
    }
    this.created.push(data);
    return Promise.resolve({ success: true, edgeId: `e${this.created.length}` });
  }
  updateEdge(): Promise<{ success: boolean }> {
    return Promise.resolve({ success: true });
  }
  deleteEdge(): Promise<{ success: boolean }> {
    return Promise.resolve({ success: true });
  }
}

describe("connectSelectionToHub", () => {
  it("creates every planned edge", async () => {
    const port = new FakeGraphEdgesPort();

    const result = await connectSelectionToHub(port, "g1", [edge("c1"), edge("c2")]);

    expect(result).toEqual({ edgeIds: ["e1", "e2"], rejected: 0 });
    expect(port.created).toHaveLength(2);
    expect(port.created[0].peso).toBe(1);
  });

  // Reconectar uma seleção já meio ligada é normal: a duplicata não pode
  // interromper as arestas seguintes.
  it("keeps going when one edge is rejected", async () => {
    const port = new FakeGraphEdgesPort(["c1"]);

    const result = await connectSelectionToHub(port, "g1", [edge("c1"), edge("c2")]);

    expect(result).toEqual({ edgeIds: ["e1"], rejected: 1 });
    expect(port.created.map((e) => e.sourceNodeId)).toEqual(["c2"]);
  });

  it("does nothing for an empty plan", async () => {
    const port = new FakeGraphEdgesPort();

    expect(await connectSelectionToHub(port, "g1", [])).toEqual({ edgeIds: [], rejected: 0 });
    expect(port.created).toEqual([]);
  });
});
