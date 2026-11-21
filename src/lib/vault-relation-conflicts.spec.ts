import { describe, expect, it } from "vitest";
import type { VaultFile, VaultGraphFolder, VaultGraphMarkdownWrite } from "./vault-bridge";
import { parseNode, serializeNode, type VaultNode } from "./vault-format";
import {
  findSharedVaultRelationConflict, guardSharedVaultRelations, resolveSharedVaultRelation,
  SharedVaultRelationError, type VaultRelationConflictFiles,
} from "./vault-relation-conflicts";

function nodes(graphId: string, weight?: number): VaultNode[] {
  return [
    {
      id: "a", tipo: "CONCEITO", grafoId: graphId, nome: "Mitose",
      relacoes: weight === undefined ? [] : [{ alvo: "b", rel: "IS_A", peso: weight }],
    },
    { id: "b", tipo: "CONCEITO", grafoId: graphId, nome: "Divisão celular", relacoes: [] },
  ];
}

class FakeRelationConflictFiles implements VaultRelationConflictFiles {
  readonly graphs = new Map([["main", nodes("main", 1)], ["review", nodes("review", 2)]]);

  async listGraphFolders(): Promise<VaultGraphFolder[]> {
    return [...this.graphs.keys()].map((id) => ({ id, directory: `/vault/${id}`, label: id, modifiedAt: "" }));
  }

  async read(dir: string): Promise<VaultFile[]> {
    return (this.graphs.get(dir.split("/").at(-1)!) ?? [])
      .map((node) => ({ relPath: `Resources/${node.id}.md`, content: serializeNode(node) }));
  }

  async readFile(): Promise<string> {
    return JSON.stringify({ version: 1, id: "review", name: "Revisão" });
  }

  async replaceGraphMarkdownBatch(writes: VaultGraphMarkdownWrite[]): Promise<boolean> {
    for (const { next } of writes) {
      const node = parseNode(next)!;
      const entries = this.graphs.get(node.grafoId)!;
      this.graphs.set(node.grafoId, entries.map((entry) => entry.id === node.id ? node : entry));
    }
    return true;
  }
}

async function getIssue(files: FakeRelationConflictFiles): Promise<SharedVaultRelationError> {
  try {
    await guardSharedVaultRelations(files, "/vault/main", "Biologia", nodes("main", 1));
  } catch (error) {
    if (error instanceof SharedVaultRelationError) return error;
    throw error;
  }
  throw new Error("Expected a conflict.");
}

describe("shared relation upload guard", () => {
  it("identifies an edge present in one copy and missing in the other", () => {
    expect(findSharedVaultRelationConflict(nodes("main", 1), nodes("review"))).toEqual({
      from: "a", to: "b", source: "Mitose", target: "Divisão celular", relation: "IS_A", current: 1, other: undefined,
    });
  });

  it("allows matching relations or graphs that share just one endpoint", () => {
    expect(findSharedVaultRelationConflict(nodes("main", 1), nodes("review", 1))).toBeNull();
    expect(findSharedVaultRelationConflict(nodes("main", 1), nodes("review", 2).slice(0, 1))).toBeNull();
  });

  it("blocks an upload with the graph names and both conflicting weights", async () => {
    await expect(guardSharedVaultRelations(new FakeRelationConflictFiles(), "/vault/main", "Biologia", nodes("main", 1)))
      .rejects.toThrow("“Biologia” (peso 1) e “Revisão” (peso 2)");
  });

  it("defaults to no write until the user selects a version, then applies it to all copies", async () => {
    const files = new FakeRelationConflictFiles();
    const issue = await getIssue(files);
    expect(files.graphs.get("review")?.[0].relacoes[0].peso).toBe(2);
    await resolveSharedVaultRelation(files, issue, "/vault/main");
    expect(files.graphs.get("review")?.[0].relacoes[0].peso).toBe(1);
  });

  it("does not overwrite a version that changed after the conflict was shown", async () => {
    const files = new FakeRelationConflictFiles();
    const issue = await getIssue(files);
    files.graphs.set("review", nodes("review", 1.5));
    await expect(resolveSharedVaultRelation(files, issue, "/vault/main")).rejects.toThrow("mudaram");
    expect(files.graphs.get("review")?.[0].relacoes[0].peso).toBe(1.5);
  });

  it("removes the relation from every affected view when the selected version omits it", async () => {
    const files = new FakeRelationConflictFiles();
    files.graphs.set("review", nodes("review"));
    const issue = await getIssue(files);
    await resolveSharedVaultRelation(files, issue, "/vault/review");
    expect(files.graphs.get("main")?.[0].relacoes).toEqual([]);
  });
});
