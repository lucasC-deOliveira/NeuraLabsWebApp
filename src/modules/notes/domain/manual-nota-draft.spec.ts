import { describe, it, expect } from "vitest";
import { syncNotaConceitoRels, collectNewTopics, buildPendingConcept, type StagedRelation } from "./manual-nota-draft";

describe("syncNotaConceitoRels", () => {
  it("keeps still-selected relations and adds DEFINE for new ids", () => {
    const prev = [{ conceitoId: "a", tipoRelacao: "EXPLICA" }];
    const result = syncNotaConceitoRels(prev, ["a", "b"]);
    expect(result).toEqual([
      { conceitoId: "a", tipoRelacao: "EXPLICA" },
      { conceitoId: "b", tipoRelacao: "DEFINE" },
    ]);
  });

  it("drops relations for deselected concepts", () => {
    const prev = [{ conceitoId: "a", tipoRelacao: "EXPLICA" }, { conceitoId: "b", tipoRelacao: "DEFINE" }];
    expect(syncNotaConceitoRels(prev, ["b"])).toEqual([{ conceitoId: "b", tipoRelacao: "DEFINE" }]);
  });
});

const existing: StagedRelation = { kind: "existing-topic", topicId: "t1", topicNome: "T1", tipoRelacao: "FUNDAMENTA" };
const novo: StagedRelation = {
  kind: "new-topic", topicTempId: "pt1", topicNome: "New T", tipoRelacao: "PERTENCE_A",
  targetAssuntoIds: ["a1"], targetAssuntoNomes: ["A1"],
};

describe("collectNewTopics", () => {
  it("dedupes new-topic entries by temp id", () => {
    expect(collectNewTopics([novo, novo, existing])).toEqual([
      { tempId: "pt1", nome: "New T", relsToAssuntos: [{ targetAssuntoId: "a1", tipoRelacao: "PERTENCE_A" }] },
    ]);
  });
});

describe("buildPendingConcept", () => {
  it("splits staged relations into existing and pending topic buckets", () => {
    const { concept, newTopics } = buildPendingConcept("Conceito X", [existing, novo], "pc1");
    expect(concept).toEqual({
      tempId: "pc1",
      nome: "Conceito X",
      relsToTopics: [{ targetTopicoId: "t1", tipoRelacao: "FUNDAMENTA" }],
      relsToPendingTopics: [{ tempTopicoId: "pt1", tipoRelacao: "PERTENCE_A" }],
    });
    expect(newTopics).toHaveLength(1);
  });
});
