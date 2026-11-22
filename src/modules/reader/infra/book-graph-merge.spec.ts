import { expect, it } from "vitest";
import { bookEdgeKey } from "@/lib/book-graph-view";
import { parseNode, type VaultNode } from "@/lib/vault-format";
import { mergeBookGraph, type BookGraphBatch } from "./book-graph-merge";

function chapter(id: string, page: number): BookGraphBatch {
  const base = { tipo: "CONCEITO" as const, grafoId: id };
  const claim: VaultNode = { ...base, id: "claim", nome: "Claim", descricao: `Citation from ${page}`, relacoes: [] };
  const evidence: VaultNode = { ...base, id: "evidence", nome: "Evidence", relacoes: [{ rel: "REFORCA", alvo: "claim", peso: 1 }] };
  return {
    imported: id, nodes: [claim, evidence],
    index: { coverage: [page], nodes: { claim: [page], evidence: [page] },
      edges: { [bookEdgeKey("evidence", "REFORCA", "claim")]: [page] } },
  };
}

it("merges repeated concepts and relations while retaining their individual page evidence", () => {
  let next = 0;
  const index = { coverage: [], imported: [], nodes: {}, edges: {} };
  const result = mergeBookGraph("book", [], index, [chapter("first", 3), chapter("second", 7)], () => String(++next));
  expect(result.notes).toHaveLength(2);
  expect(result.index.coverage).toEqual([3, 7]);
  expect(result.index.imported).toEqual(["first", "second"]);
  expect(result.index.edges[bookEdgeKey("2", "REFORCA", "1")]).toEqual([3, 7]);
  expect(parseNode(result.notes[0].content)?.descricao).toContain("Citation from 7");
  const appended = mergeBookGraph("book", result.notes, result.index, [chapter("third", 9)], () => String(++next));
  expect(appended.notes.every(({ previousPath }) => previousPath)).toBe(true);
  expect(appended.index.nodes["1"]).toEqual([3, 7, 9]);
});
