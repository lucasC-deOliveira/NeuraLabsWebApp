import { describe, it, expect, vi, beforeEach } from "vitest";
import { HttpGraphAdapter } from "./graph-http.adapter";

vi.mock("@/lib/graph-api", () => ({
  getGraphNodes: vi.fn(),
  getGraphEdges: vi.fn(),
  getGrafoInfo: vi.fn(),
  loadGraphVisualState: vi.fn(),
  saveGraphPositions: vi.fn(),
  searchGraphNodeContent: vi.fn(),
}));
vi.mock("@/lib/ai-api", () => ({ generateLearningPath: vi.fn() }));

import * as graphApi from "@/lib/graph-api";
import * as aiApi from "@/lib/ai-api";

// The adapter is a thin Anti-Corruption Layer: every method must delegate to the
// matching @/lib client with the same arguments and forward its result unchanged.
describe("HttpGraphAdapter", () => {
  const adapter = new HttpGraphAdapter();
  beforeEach(() => vi.clearAllMocks());

  it("delegates getGraphNodes to the graph client, forwarding grafoId and result", async () => {
    const result = { nodes: [], edges: [] };
    vi.mocked(graphApi.getGraphNodes).mockResolvedValue(result);
    await expect(adapter.getGraphNodes("g1")).resolves.toBe(result);
    expect(graphApi.getGraphNodes).toHaveBeenCalledWith("g1");
  });

  it("delegates getGraphEdges with grafoId", async () => {
    vi.mocked(graphApi.getGraphEdges).mockResolvedValue([]);
    await adapter.getGraphEdges("g2");
    expect(graphApi.getGraphEdges).toHaveBeenCalledWith("g2");
  });

  it("delegates getGrafoInfo with grafoId", async () => {
    vi.mocked(graphApi.getGrafoInfo).mockResolvedValue(null);
    await adapter.getGrafoInfo("g3");
    expect(graphApi.getGrafoInfo).toHaveBeenCalledWith("g3");
  });

  it("delegates loadGraphVisualState with grafoId", async () => {
    vi.mocked(graphApi.loadGraphVisualState).mockResolvedValue(null);
    await adapter.loadGraphVisualState("g4");
    expect(graphApi.loadGraphVisualState).toHaveBeenCalledWith("g4");
  });

  it("delegates saveGraphPositions forwarding grafoId and positions", async () => {
    const positions = { n1: { x: 1, y: 2 } };
    vi.mocked(graphApi.saveGraphPositions).mockResolvedValue(undefined);
    await adapter.saveGraphPositions("g5", positions);
    expect(graphApi.saveGraphPositions).toHaveBeenCalledWith("g5", positions);
  });

  it("delegates searchGraphNodeContent forwarding grafoId and query", async () => {
    vi.mocked(graphApi.searchGraphNodeContent).mockResolvedValue(["id1"]);
    await expect(adapter.searchGraphNodeContent("g6", "term")).resolves.toEqual(["id1"]);
    expect(graphApi.searchGraphNodeContent).toHaveBeenCalledWith("g6", "term");
  });

  it("delegates generateLearningPath to the ai client with grafoId", async () => {
    const path = { steps: [] };
    vi.mocked(aiApi.generateLearningPath).mockResolvedValue(path);
    await expect(adapter.generateLearningPath("g7")).resolves.toBe(path);
    expect(aiApi.generateLearningPath).toHaveBeenCalledWith("g7");
  });
});
