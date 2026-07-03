import { describe, it, expect } from "vitest";
import { addExistingItems, type AddExistingItemsInput } from "./add-existing-items";
import type { NodeCreationPort } from "./create-graph-node";
import type { CreateEdgeData } from "../ports/graph-edges.port";

class FakeNodeCreationPort implements NodeCreationPort {
  added: Array<[string, Record<string, unknown>]> = [];
  edges: CreateEdgeData[] = [];
  async addNodeToGraph(_grafoId: string, tipoNode: string, data: Record<string, unknown>): Promise<{ success: boolean; nodeId: string }> {
    this.added.push([tipoNode, data]);
    return { success: true, nodeId: `${tipoNode}-node` };
  }
  async createEdge(_grafoId: string, data: CreateEdgeData): Promise<{ success: boolean; edgeId: string }> {
    this.edges.push(data);
    return { success: true, edgeId: "e1" };
  }
}

function input(overrides: Partial<AddExistingItemsInput>): AddExistingItemsInput {
  return {
    grafoId: "g1",
    type: "FLASHCARD",
    itemIds: [],
    flashcards: [],
    notas: [],
    flashcardConceitos: [],
    notaConceitos: [],
    notaTextoBrutoId: "",
    ...overrides,
  };
}

describe("addExistingItems", () => {
  it("links existing flashcards to their conceito relations using the returned node id", async () => {
    const port = new FakeNodeCreationPort();
    const result = await addExistingItems(
      port,
      input({
        type: "FLASHCARD",
        itemIds: ["f1"],
        flashcards: [{ id: "f1", conceitoId: "c-of-f1" }],
        flashcardConceitos: [{ conceitoId: "c1", relacao: "DEFINE", peso: 1 }],
      }),
    );
    expect(port.added[0]).toEqual(["FLASHCARD", { entityId: "f1", conceitoId: "c-of-f1" }]);
    expect(result.createdEdges).toBe(1);
    expect(port.edges[0]).toMatchObject({ sourceNodeId: "FLASHCARD-node", targetNodeId: "c1", tipoRelacao: "DEFINE" });
  });

  it("for notas, links conceitos and the source TEXTO_BRUTO (GERA)", async () => {
    const port = new FakeNodeCreationPort();
    const result = await addExistingItems(
      port,
      input({
        type: "NOTA",
        itemIds: ["n1"],
        notas: [{ id: "n1" }],
        notaConceitos: [{ conceitoId: "c1", relacao: "EXPLICA", peso: 1 }],
        notaTextoBrutoId: "txt1",
      }),
    );
    expect(result.createdEdges).toBe(2);
    expect(port.edges.map((e) => e.tipoRelacao)).toEqual(["EXPLICA", "GERA"]);
  });

  it("skips unknown item ids", async () => {
    const port = new FakeNodeCreationPort();
    await addExistingItems(port, input({ type: "FLASHCARD", itemIds: ["ghost"] }));
    expect(port.added).toHaveLength(0);
  });
});
