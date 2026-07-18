import { describe, expect, it } from "vitest";
import { chunkProgressLabel, filterPlanToConcepts } from "./classification-review";
import type { ClassificationPlan } from "@/modules/graph/application/ports/graph-ai.port";

const PLAN: ClassificationPlan = {
  assuntos: [
    { nome: "Algoritmos", descricao: "" },
    { nome: "Redes", descricao: "" },
  ],
  topicos: [
    { nome: "Grafos", assunto: "Algoritmos", descricao: "" },
    { nome: "TCP", assunto: "Redes", descricao: "" },
  ],
  conceitos: [
    { nome: "Dijkstra", topico: "Grafos", descricao: "", flashcardIds: ["fc1"] },
    { nome: "Handshake", topico: "TCP", descricao: "", flashcardIds: ["fc2"] },
  ],
};

describe("filterPlanToConcepts", () => {
  it("keeps only the selected concepts and the structure they reference", () => {
    const filtered = filterPlanToConcepts(PLAN, new Set([0]));
    expect(filtered.conceitos.map((c) => c.nome)).toEqual(["Dijkstra"]);
    expect(filtered.topicos.map((t) => t.nome)).toEqual(["Grafos"]);
    expect(filtered.assuntos.map((a) => a.nome)).toEqual(["Algoritmos"]);
  });

  it("returns an empty plan when nothing is kept", () => {
    expect(filterPlanToConcepts(PLAN, new Set())).toEqual({ assuntos: [], topicos: [], conceitos: [] });
  });
});

describe("chunkProgressLabel", () => {
  it("labels the chunk in review over the total", () => {
    expect(chunkProgressLabel(90, 0, 30)).toBe("Lote 1/3");
    expect(chunkProgressLabel(90, 30, 30)).toBe("Lote 2/3");
    expect(chunkProgressLabel(90, 60, 30)).toBe("Lote 3/3");
  });

  it("never exceeds the total on the last partial chunk", () => {
    expect(chunkProgressLabel(31, 30, 30)).toBe("Lote 2/2");
    expect(chunkProgressLabel(30, 30, 30)).toBe("Lote 1/1");
  });
});
