import { mkdtempSync, mkdirSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { expect, it } from "vitest";
import { readBookGraphPage } from "../../electron/vault-book-graph";

it("loads only members from the requested book page and distinguishes missing analysis", async () => {
  const vault = mkdtempSync(join(tmpdir(), "neuralabs-book-scope-"));
  try {
    const id = `book-${"a".repeat(40)}`;
    const graph = join(vault, ".neuralabs", "graphs", id);
    mkdirSync(graph, { recursive: true });
    mkdirSync(join(vault, "Resources"));
    writeFileSync(join(graph, ".neuralabs-graph.json"), JSON.stringify({
      id, layout: "shared-para", bookSource: { consolidated: true },
      bookIndex: { coverage: [2, 3], nodes: { first: [2], later: [3] }, edges: {} },
    }));
    writeFileSync(join(graph, ".neuralabs-members.json"), JSON.stringify([
      { id: "first", folder: "Resources", fields: [] },
      { id: "later", folder: "Resources", fields: [] },
    ]));
    writeFileSync(join(vault, "Resources", "first.md"), "---\nid: first\ntipo: CONCEITO\ntitulo: First\n---\n\nPage 2");
    expect(await readBookGraphPage(vault, id, 2)).toMatchObject({
      status: "ready", files: [{ relPath: "Resources/first.md" }], edges: [],
    });
    expect(await readBookGraphPage(vault, id, 4)).toEqual({ status: "unanalyzed", graphId: id });
    expect(await readBookGraphPage(vault, "../another-graph", 2)).toEqual({ status: "missing" });
  } finally {
    rmSync(vault, { recursive: true, force: true });
  }
});
