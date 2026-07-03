import { describe, it, expect } from "vitest";
import { flattenConceptTree, getTopicosForAssunto, filterFlatConcepts, findTopicName } from "./concept-tree";
import type { ConceitoArvore } from "../concept-tree.types";

const tree: ConceitoArvore[] = [
  {
    id: "a1", nome: "Direito",
    relAssuntoTopico: [
      {
        tipoRelacao: "TEM",
        topicos: [
          {
            id: "t1", nome: "Constitucional",
            relacoesTopicoConceito: [
              { tipoRelacao: "DEFINE", conceitos: [{ id: "c2", nome: "Soberania" }, { id: "c1", nome: "Autonomia" }] },
            ],
          },
        ],
      },
    ],
  },
];

describe("flattenConceptTree", () => {
  it("flattens and sorts concepts by name, with context map", () => {
    const { flat, conceptMap } = flattenConceptTree(tree);
    expect(flat.map((c) => c.nome)).toEqual(["Autonomia", "Soberania"]);
    expect(flat[0]).toMatchObject({ id: "c1", topicoNome: "Constitucional", assuntoNome: "Direito", assuntoId: "a1", topicoId: "t1" });
    expect(conceptMap.get("c2")).toEqual({ nome: "Soberania", topicoNome: "Constitucional", assuntoNome: "Direito" });
  });
});

describe("getTopicosForAssunto", () => {
  it("returns deduped topicos of an assunto", () => {
    expect(getTopicosForAssunto(tree, "a1")).toEqual([{ id: "t1", nome: "Constitucional" }]);
  });
  it("returns empty for unknown assunto", () => {
    expect(getTopicosForAssunto(tree, "nope")).toEqual([]);
  });
});

describe("filterFlatConcepts", () => {
  it("matches by concept, topic or subject substring", () => {
    const { flat } = flattenConceptTree(tree);
    expect(filterFlatConcepts(flat, "sober").map((c) => c.id)).toEqual(["c2"]);
    expect(filterFlatConcepts(flat, "direito").length).toBe(2);
    expect(filterFlatConcepts(flat, "").length).toBe(2);
  });
});

describe("findTopicName", () => {
  it("resolves a topic name by id", () => {
    expect(findTopicName(tree, "t1")).toBe("Constitucional");
    expect(findTopicName(tree, "missing")).toBe("");
  });
});
