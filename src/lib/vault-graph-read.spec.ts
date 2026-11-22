import { mkdtempSync, mkdirSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { expect, it } from "vitest";
import { readLegacyGraphSnapshot, readSharedGraphSnapshot } from "../../electron/vault-graph-read";
import { readSharedGraphFiles, sharedGraph } from "../../electron/vault-shared-para";
import { graphWatchFilter } from "../../electron/vault-graph-watch-filter";

it("matches the existing projection and can read only relevant graph members", async () => {
  const vault = mkdtempSync(join(tmpdir(), "neuralabs-graph-read-"));
  try {
    const dir = join(vault, ".neuralabs", "graphs", "sample");
    const resources = join(vault, "Resources");
    mkdirSync(dir, { recursive: true });
    mkdirSync(resources);
    const manifest = { id: "sample", layout: "shared-para" };
    writeFileSync(join(dir, ".neuralabs-members.json"), JSON.stringify([
      { id: "member", folder: "Resources", fields: [] },
    ]));
    writeFileSync(join(resources, "member.md"), "---\nid: member\ntipo: CONCEITO\ntitulo: Member\n---\n\nSource");
    const graph = sharedGraph(vault, dir, manifest);
    expect(await readSharedGraphSnapshot(graph)).toEqual(readSharedGraphFiles(graph));
    expect(await readSharedGraphSnapshot(graph, { ids: new Set(["elsewhere"]) })).toEqual([]);
    expect(await readLegacyGraphSnapshot(vault)).toEqual([
      expect.objectContaining({ relPath: join("Resources", "member.md") }),
    ]);
  } finally {
    rmSync(vault, { recursive: true, force: true });
  }
});

it("accepts only member Markdown and metadata from the current graph", () => {
  const root = join(tmpdir(), "graph-vault");
  const dir = join(root, ".neuralabs", "graphs", "sample");
  const accepts = graphWatchFilter({ dir, members: [{ id: "member" }] }, root);
  expect(accepts("Resources\\member.md")).toBe(true);
  expect(accepts(".neuralabs/graphs/sample/.neuralabs-members.json")).toBe(true);
  expect(accepts(".neuralabs/graphs/other/.neuralabs-members.json")).toBe(false);
  expect(accepts("Resources/Bibliografia/Transcricoes/book/Livro.md")).toBe(false);
  expect(accepts("Resources/other.md")).toBe(false);
  expect(graphWatchFilter(null, root)("Projects/notes/chapter.md")).toBe(true);
});
