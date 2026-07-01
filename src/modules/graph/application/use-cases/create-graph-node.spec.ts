import { describe, it, expect } from "vitest";
import { createGraphNode, createDeck, CreateNodeValidationError, type CreateGraphNodeInput } from "./create-graph-node";
import type { GraphNodesPort } from "../ports/graph-nodes.port";
import type { GraphEdgesPort, CreateEdgeData } from "../ports/graph-edges.port";

// Named fake implementing the ports used by the create-node use-cases.
class FakeGraphPort implements Pick<GraphNodesPort, "addNodeToGraph" | "createBaralhoNode">, Pick<GraphEdgesPort, "createEdge"> {
  addedNodes: Array<[string, string, Record<string, unknown>]> = [];
  createdEdges: CreateEdgeData[] = [];
  decks: Array<[string, string, string[]]> = [];
  failEdges = false;

  async addNodeToGraph(grafoId: string, tipoNode: string, data: Record<string, unknown>): Promise<{ success: boolean; nodeId: string }> {
    this.addedNodes.push([grafoId, tipoNode, data]);
    return { success: true, nodeId: "node-1" };
  }
  async createEdge(_grafoId: string, data: CreateEdgeData): Promise<{ success: boolean; edgeId: string }> {
    if (this.failEdges) throw new Error("edge failed");
    this.createdEdges.push(data);
    return { success: true, edgeId: "e1" };
  }
  async createBaralhoNode(grafoId: string, titulo: string, flashcardIds: string[]): Promise<{ success: boolean; nodeId: string }> {
    this.decks.push([grafoId, titulo, flashcardIds]);
    return { success: true, nodeId: "deck-1" };
  }
}

function input(overrides: Partial<CreateGraphNodeInput>): CreateGraphNodeInput {
  return {
    grafoId: "g1",
    type: "ASSUNTO",
    form: { nome: "A", descricao: "", pergunta: "", resposta: "", conteudo: "", tipoNota: "PERMANENTE", subtipo: "", fonte: "" },
    topicoAssuntos: [],
    conceitoTopicos: [],
    flashcardConceitos: [],
    notaConceitos: [],
    acceptedSuggestions: [],
    notaTextoBrutoId: "",
    ...overrides,
  };
}

describe("createGraphNode", () => {
  it("adds the node with the built payload and returns its id", async () => {
    const port = new FakeGraphPort();
    const result = await createGraphNode(port, input({ type: "ASSUNTO", form: { ...input({}).form, nome: " A " } }));
    expect(result).toEqual({ nodeId: "node-1", createdEdges: 0 });
    expect(port.addedNodes[0]).toEqual(["g1", "ASSUNTO", { nome: "A", descricao: null }]);
  });

  it("creates the type edges with the new node as source, counting successes", async () => {
    const port = new FakeGraphPort();
    const result = await createGraphNode(
      port,
      input({ type: "TOPICO", form: { ...input({}).form, nome: "T" }, topicoAssuntos: [{ assuntoId: "a1", relacao: "PERTENCE_A", peso: 1 }] }),
    );
    expect(result.createdEdges).toBe(1);
    expect(port.createdEdges[0]).toMatchObject({ sourceNodeId: "node-1", targetNodeId: "a1", tipoRelacao: "PERTENCE_A" });
  });

  it("tolerates individual edge failures (createdEdges stays 0)", async () => {
    const port = new FakeGraphPort();
    port.failEdges = true;
    const result = await createGraphNode(
      port,
      input({ type: "TOPICO", form: { ...input({}).form, nome: "T" }, topicoAssuntos: [{ assuntoId: "a1", relacao: "PERTENCE_A", peso: 1 }] }),
    );
    expect(result.createdEdges).toBe(0);
  });

  it("throws CreateNodeValidationError and never hits the port when invalid", async () => {
    const port = new FakeGraphPort();
    await expect(createGraphNode(port, input({ type: "ASSUNTO", form: { ...input({}).form, nome: "" } }))).rejects.toBeInstanceOf(
      CreateNodeValidationError,
    );
    expect(port.addedNodes).toHaveLength(0);
  });
});

describe("createDeck", () => {
  it("creates a baralho node with a trimmed title and returns its id", async () => {
    const port = new FakeGraphPort();
    const id = await createDeck(port, "g1", " Deck ", ["f1", "f2"]);
    expect(id).toBe("deck-1");
    expect(port.decks[0]).toEqual(["g1", "Deck", ["f1", "f2"]]);
  });
});
