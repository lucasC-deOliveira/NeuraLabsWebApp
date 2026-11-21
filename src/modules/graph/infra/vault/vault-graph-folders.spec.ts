import { describe, expect, it } from "vitest";
import { mkdirSync, mkdtempSync, rmdirSync, unlinkSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { listVaultGraphFolders } from "../../../../../electron/vault-graph-folders.js";

describe("listVaultGraphFolders", () => {
  it("finds exported graph directories and ignores unrelated folders", () => {
    const vault = mkdtempSync(join(tmpdir(), "neuralabs-graph-folders-"));
    const graph = join(vault, "renamed--g1");
    const unrelated = join(vault, "other--g2");
    const resources = join(graph, "Resources");
    const node = join(resources, "concept.md");
    const guide = join(unrelated, "AGENTS.md");
    try {
      mkdirSync(graph);
      mkdirSync(unrelated);
      mkdirSync(resources);
      writeFileSync(node, "# Concept");
      writeFileSync(guide, "# Guide only");
      expect(listVaultGraphFolders(vault)).toEqual([
        expect.objectContaining({ id: "g1", directory: graph, label: "renamed" }),
      ]);
    } finally {
      unlinkSync(node);
      unlinkSync(guide);
      rmdirSync(resources);
      rmdirSync(unrelated);
      rmdirSync(graph);
      rmdirSync(vault);
    }
  });
});
