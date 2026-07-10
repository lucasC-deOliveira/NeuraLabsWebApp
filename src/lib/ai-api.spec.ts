import { describe, it, expect, vi, beforeEach } from "vitest";
import { apiFetch } from "./api";
import * as ai from "./ai-api";

vi.mock("./api", () => ({ apiFetch: vi.fn(() => Promise.resolve({})) }));
const mockApiFetch = vi.mocked(apiFetch);

beforeEach(() => mockApiFetch.mockClear());

const lastCall = () =>
  mockApiFetch.mock.calls[mockApiFetch.mock.calls.length - 1] as [string, RequestInit?];

describe("ai-api endpoints with a request body", () => {
  it("suggestNotaRelations posts titulo+conteudo", async () => {
    await ai.suggestNotaRelations("g1", "T", "C");
    expect(lastCall()).toEqual([
      "/ai/graph/graphs/g1/nota-relations",
      { method: "POST", body: JSON.stringify({ titulo: "T", conteudo: "C" }) },
    ]);
  });

  it("analyzeRawText / saveSelectedNotas / suggestGapFill / community / fill-gaps", async () => {
    await ai.analyzeRawText("texto");
    expect(lastCall()).toEqual(["/ai/graph/notas/analyze", { method: "POST", body: JSON.stringify({ rawText: "texto" }) }]);
    await ai.saveSelectedNotas([{ titulo: "t", conteudo: "c" }]);
    expect(lastCall()[0]).toBe("/ai/graph/notas/save");
    await ai.suggestGapFill("g1", { labelsA: [], labelsB: [], bridgeA: "a", bridgeB: "b" });
    expect(lastCall()[0]).toBe("/ai/graph/graphs/g1/gap-suggestions");
    await ai.generateCommunitySummary("g1", ["n1"]);
    expect(lastCall()).toEqual(["/ai/graph/graphs/g1/community-summary", { method: "POST", body: JSON.stringify({ nodeIds: ["n1"] }) }]);
    await ai.fillKnowledgeGaps("g1", []);
    expect(lastCall()).toEqual(["/ai/graph/graphs/g1/fill-gaps", { method: "POST", body: JSON.stringify({ gaps: [] }) }]);
  });

  it("graph generation: text/plan/build (build defaults saveBruto=true)", async () => {
    await ai.generateGraphFromText("g1", "txt");
    expect(lastCall()[0]).toBe("/ai/graph/graphs/g1/generate-graph");
    await ai.planGraphFromText("g1", "txt");
    expect(lastCall()[0]).toBe("/ai/graph/graphs/g1/generate-graph/plan");
    await ai.buildGraphFromPlan("g1", "txt", { p: 1 });
    expect(lastCall()).toEqual([
      "/ai/graph/graphs/g1/generate-graph/build",
      { method: "POST", body: JSON.stringify({ rawText: "txt", plan: { p: 1 }, saveBruto: true }) },
    ]);
  });

  it("addInsightsToGraph / applyAutoLink / addMissingPrerequisite / chat / merge", async () => {
    await ai.addInsightsToGraph("g1", "s1", []);
    expect(lastCall()[0]).toBe("/ai/graph/graphs/g1/nodes/s1/insights/add");
    await ai.applyAutoLink("g1", []);
    expect(lastCall()[0]).toBe("/ai/graph/graphs/g1/auto-link/apply");
    await ai.addMissingPrerequisite("g1", "Nome", "CONCEITO", ["x"]);
    expect(lastCall()).toEqual([
      "/ai/graph/graphs/g1/missing-prerequisites/add",
      { method: "POST", body: JSON.stringify({ nome: "Nome", tipo: "CONCEITO", connectToIds: ["x"] }) },
    ]);
    await ai.chatWithGraph("g1", "q?", []);
    expect(lastCall()).toEqual(["/ai/graph/graphs/g1/chat", { method: "POST", body: JSON.stringify({ question: "q?", history: [] }) }]);
    await ai.mergeDuplicates("g1", "keep", ["d1"]);
    expect(lastCall()[0]).toBe("/ai/graph/graphs/g1/merge-duplicates");
  });
});

describe("ai-api POST endpoints without a body", () => {
  it("routes the action endpoints", async () => {
    // thunks (não promises) para a chamada acontecer DENTRO do loop, após o clear.
    const cases: Array<[() => Promise<unknown>, string]> = [
      [() => ai.generateFlashcardsViaIA("n1"), "/ai/graph/notas/n1/flashcards"],
      [() => ai.generateNodeInsights("g1", "n1"), "/ai/graph/graphs/g1/nodes/n1/insights"],
      [() => ai.listBaralhosInGrafo("g1"), "/ai/graph/graphs/g1/baralhos"],
      [() => ai.populateGraphFromBaralho("g1", "b1"), "/ai/graph/graphs/g1/baralhos/b1/populate"],
      [() => ai.autoLinkGraph("g1"), "/ai/graph/graphs/g1/auto-link"],
      [() => ai.detectDuplicates("g1"), "/ai/graph/graphs/g1/detect-duplicates"],
      [() => ai.expandNode("g1", "n1"), "/ai/graph/graphs/g1/nodes/n1/expand"],
      [() => ai.detectMissingPrerequisites("g1"), "/ai/graph/graphs/g1/missing-prerequisites"],
      [() => ai.generateLearningPath("g1"), "/ai/graph/graphs/g1/learning-path"],
      [() => ai.assessCompleteness("g1"), "/ai/graph/graphs/g1/assess-completeness"],
    ];
    for (const [call, path] of cases) {
      mockApiFetch.mockClear();
      await call();
      expect(lastCall()).toEqual([path, { method: "POST" }]);
    }
  });

  it("posts the threshold to the similarity duplicate detector", async () => {
    mockApiFetch.mockClear();
    await ai.detectDuplicatesBySimilarity("g1", 0.9);
    expect(lastCall()).toEqual([
      "/ai/graph/graphs/g1/detect-duplicates-similar",
      { method: "POST", body: JSON.stringify({ threshold: 0.9 }) },
    ]);
  });
});
