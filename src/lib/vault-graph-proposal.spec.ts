import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, expect, it } from "vitest";
import { commitVaultWrites, sharedGraph, writeSharedGraphFiles } from "../../electron/vault-shared-para";
import { inspectProposalGraph, planExternalGraph } from "../../scripts/vault-graph-proposal";
import { serializeNode } from "./vault-format";

const temporary: string[] = [];
afterEach(() => {
  for (const root of temporary.splice(0)) rmSync(root, { recursive: true, force: true });
});

function fixture(): { root: string; revision: string } {
  const root = mkdtempSync(join(tmpdir(), "neuralabs-proposal-"));
  temporary.push(root);
  mkdirSync(join(root, "Resources"));
  writeFileSync(join(root, "Resources", "source.txt"), "Example source");
  const id = "graph";
  const location = join(root, ".neuralabs", "graphs", id);
  const manifest = { version: 1, id, name: "Test", layout: "shared-para" };
  writeSharedGraphFiles(sharedGraph(root, location, manifest), [
    { relPath: ".neuralabs-graph.json", content: JSON.stringify(manifest) },
    { relPath: "Resources/concept.md", content: serializeNode({
      id: "concept", grafoId: id, tipo: "CONCEITO", nome: "Existing concept", relacoes: [],
    }) },
  ]);
  return { root, revision: inspectProposalGraph(root, id).baseRevision };
}

function draft(revision: string, kind = "SINTETIZA") {
  return {
    version: 1, graphId: "graph", baseRevision: revision, summary: "Create a linked note",
    sources: [{ path: "Resources/source.txt", locator: "Section one" }],
    creates: [{ id: "note", type: "NOTA", title: "New note", body: "A sourced idea." }],
    reuses: ["concept"],
    relations: [{ from: "note", to: "concept", type: kind, reason: "The note summarizes the concept." }],
  };
}

it("validates a draft without writing and applies one canonical note linked to the reused concept", () => {
  const { root, revision } = fixture();
  const result = planExternalGraph(root, draft(revision));
  expect(inspectProposalGraph(root, "graph").members).toBe(1);
  expect(result.preview.reuses).toMatchObject([{ id: "concept" }]);
  expect(commitVaultWrites(result.writes)).toBe(true);
  expect(inspectProposalGraph(root, "graph", "New note")).toMatchObject({
    members: 2, nodes: [{ id: "note", relations: [{ rel: "SINTETIZA", alvo: "concept" }] }],
  });
  expect(() => planExternalGraph(root, draft(revision))).toThrow("O grafo mudou");
});

it("rejects a relationship the application does not allow", () => {
  const { root, revision } = fixture();
  expect(() => planExternalGraph(root, draft(revision, "CONTEM"))).toThrow("Relação inválida");
  expect(inspectProposalGraph(root, "graph").members).toBe(1);
});
