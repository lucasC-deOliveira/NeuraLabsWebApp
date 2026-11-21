import { describe, expect, it } from "vitest";
import { vaultEdgeViews } from "./vault-edge-views";

describe("vaultEdgeViews", () => {
  it("keeps direction, type, and weight while resolving labels without the API", () => {
    const nodes = [{ id: "concept", label: "Biology", type: "CONCEITO", nivelDominio: 0, prioridadeRevisao: 5 }];
    const edges = [{ source: "card", target: "concept", type: "TESTA", peso: 0.75 }];
    expect(vaultEdgeViews(nodes, edges)).toEqual([{
      id: '["card","concept","TESTA"]', source: "card", target: "concept", tipoRelacao: "TESTA",
      peso: 0.75, sourceLabel: "card", targetLabel: "Biology",
    }]);
  });
});
