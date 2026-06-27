import { describe, it, expect, vi, beforeEach } from "vitest";
import { apiFetch } from "./api";
import * as g from "./graph-api";

vi.mock("./api", () => ({ apiFetch: vi.fn(() => Promise.resolve({})) }));
const mockApiFetch = vi.mocked(apiFetch);

beforeEach(() => mockApiFetch.mockClear());

// helper: last call args
const lastCall = () => mockApiFetch.mock.calls[mockApiFetch.mock.calls.length - 1] as [string, RequestInit?];

describe("graph-api graphs CRUD", () => {
  it("lists, creates and reads graph info", async () => {
    await g.listUserGraphs();
    expect(lastCall()[0]).toBe("/graph/graphs");
    await g.createGrafo("Bio", "desc");
    expect(lastCall()).toEqual(["/graph/graphs", { method: "POST", body: JSON.stringify({ nome: "Bio", descricao: "desc" }) }]);
    await g.getGrafoInfo("g1");
    expect(lastCall()[0]).toBe("/graph/graphs/g1/info");
  });

  it("deleteGrafo appends ?keep only when keepTypes is given", async () => {
    await g.deleteGrafo("g1", { keepTypes: ["FLASHCARD", "BARALHO"] });
    expect(lastCall()[0]).toBe("/graph/graphs/g1?keep=FLASHCARD,BARALHO");
    await g.deleteGrafo("g1");
    expect(lastCall()[0]).toBe("/graph/graphs/g1");
    await g.deleteGrafo("g1", { keepTypes: [] });
    expect(lastCall()[0]).toBe("/graph/graphs/g1");
  });

  it("subgrafo create/extract/expand and rename/visual state", async () => {
    await g.createSubgrafo("g1", { nome: "S", tipoRelacao: "DERIVA_DE" });
    expect(lastCall()[0]).toBe("/graph/graphs/g1/subgrafos");
    await g.extractNodesToSubgrafo("g1", { nodeIds: ["a"], nome: "S", tipoRelacao: "DERIVA_DE" });
    expect(lastCall()[0]).toBe("/graph/graphs/g1/extract");
    await g.expandSubgrafo("c1");
    expect(lastCall()[0]).toBe("/graph/graphs/c1/expand");
    await g.updateGrafoNome("g1", "Novo");
    expect(lastCall()).toEqual(["/graph/graphs/g1", { method: "PATCH", body: JSON.stringify({ nome: "Novo" }) }]);
    await g.saveGraphVisualState("g1", { zoom: 1 });
    expect(lastCall()).toEqual(["/graph/graphs/g1/visual", { method: "PUT", body: JSON.stringify({ state: { zoom: 1 } }) }]);
    await g.loadGraphVisualState("g1");
    expect(lastCall()[0]).toBe("/graph/graphs/g1/visual");
  });
});

describe("graph-api qs (query string) building", () => {
  it("omits the query when grafoId is undefined and adds it when present", async () => {
    await g.getGraphNodes();
    expect(lastCall()[0]).toBe("/graph");
    await g.getGraphNodes("g1");
    expect(lastCall()[0]).toBe("/graph?grafoId=g1");
    await g.getGraphEdges("g1");
    expect(lastCall()[0]).toBe("/graph/edges?grafoId=g1");
    await g.getAvailableItems("g1");
    expect(lastCall()[0]).toBe("/graph/available-items?grafoId=g1");
    await g.searchGraphNodeContent("g1", "foo");
    expect(lastCall()[0]).toBe("/graph/search?grafoId=g1&q=foo");
  });
});

describe("graph-api nodes", () => {
  it("addNodeToGraph links an existing entity but creates a new one", async () => {
    await g.addNodeToGraph("g1", "CONCEITO", { entityId: "e1" });
    expect(lastCall()).toEqual([
      "/graph/graphs/g1/nodes/link",
      { method: "POST", body: JSON.stringify({ tipoNode: "CONCEITO", entityId: "e1" }) },
    ]);
    await g.addNodeToGraph("g1", "CONCEITO", { nome: "X" });
    expect(lastCall()).toEqual([
      "/graph/graphs/g1/nodes",
      { method: "POST", body: JSON.stringify({ tipoNode: "CONCEITO", nome: "X" }) },
    ]);
  });

  it("createBaralhoNode / addProvaToGraph / listUserFlashcards", async () => {
    await g.createBaralhoNode("g1", "Deck", ["f1"]);
    expect(lastCall()[0]).toBe("/graph/graphs/g1/baralho");
    await g.addProvaToGraph("g1", "p1");
    expect(lastCall()).toEqual(["/graph/graphs/g1/prova", { method: "POST", body: JSON.stringify({ provaId: "p1" }) }]);
    await g.listUserFlashcards();
    expect(lastCall()[0]).toBe("/graph/flashcards");
  });

  it("updateGraphNode patches by referenciaId with tipoNode merged in", async () => {
    await g.updateGraphNode("CONCEITO", "ref1", { nome: "N" }, "g1");
    expect(lastCall()).toEqual([
      "/graph/nodes/ref1",
      { method: "PATCH", body: JSON.stringify({ tipoNode: "CONCEITO", nome: "N" }) },
    ]);
  });

  it("deleteGraphNode strips the 'tipo:' prefix from the id and adds flags", async () => {
    await g.deleteGraphNode("CONCEITO:abc", "g1", { deleteConnected: true });
    expect(lastCall()[0]).toBe("/graph/nodes/abc?grafoId=g1&deleteConnected=true");
    await g.deleteGraphNode("abc");
    expect(lastCall()[0]).toBe("/graph/nodes/abc");
  });

  it("getNodeDetails and removeNodeFromGraph (link removal)", async () => {
    await g.getNodeDetails("CONCEITO", "ref1");
    expect(lastCall()[0]).toBe("/graph/nodes/ref1/details?tipoNode=CONCEITO");
    const res = await g.removeNodeFromGraph("CONCEITO:abc", "g1");
    expect(lastCall()[0]).toBe("/graph/graphs/g1/nodes/abc");
    expect(res).toEqual({ success: true });
  });
});

describe("graph-api edges", () => {
  it("createEdge maps the response to { success, edgeId }", async () => {
    mockApiFetch.mockResolvedValueOnce({ edgeId: "e1" });
    const res = await g.createEdge("g1", { sourceNodeId: "a", targetNodeId: "b", tipoRelacao: "RELACIONADO" });
    expect(lastCall()[0]).toBe("/graph/graphs/g1/edges");
    expect(res).toEqual({ success: true, edgeId: "e1" });
  });

  it("updateEdge and deleteEdge resolve success", async () => {
    expect(await g.updateEdge("e1", "g1", { peso: 2 })).toEqual({ success: true });
    expect(lastCall()).toEqual(["/graph/graphs/g1/edges/e1", { method: "PATCH", body: JSON.stringify({ peso: 2 }) }]);
    expect(await g.deleteEdge("e1", "g1")).toEqual({ success: true });
    expect(lastCall()).toEqual(["/graph/graphs/g1/edges/e1", { method: "DELETE" }]);
  });
});

describe("graph-api import/export/sync/positions/deck", () => {
  it("routes import, export, sync, positions and deck", async () => {
    await g.importGraph("g1", { nodes: [], edges: [] });
    expect(lastCall()[0]).toBe("/graph/graphs/g1/import");
    await g.exportGraph("g1");
    expect(lastCall()[0]).toBe("/graph/graphs/g1/export");
    await g.syncGraphFromVault("g1", { nodes: [], edges: [] });
    expect(lastCall()[0]).toBe("/graph/graphs/g1/sync");
    await g.saveGraphPositions("g1", { a: { x: 1, y: 2 } });
    expect(lastCall()).toEqual(["/graph/graphs/g1/positions", { method: "POST", body: JSON.stringify({ positions: { a: { x: 1, y: 2 } } }) }]);
    await g.getDeckForStudy("b1");
    expect(lastCall()[0]).toBe("/graph/baralho/b1/study");
  });
});
