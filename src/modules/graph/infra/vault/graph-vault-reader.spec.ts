import { describe, expect, it } from "vitest";
import { listLocalGraphs, openGraphFromVault, type GraphVaultFiles } from "./graph-vault-reader";

class FakeGraphVaultFiles implements GraphVaultFiles {
  manifest: string | null = null;
  async getPath(): Promise<string> { return "/vault"; }
  async listGraphFolders() {
    return [{ id: "g1", directory: "/vault/renamed--g1", label: "renamed", modifiedAt: "2026-01-01T00:00:00Z" }];
  }
  async readFile(): Promise<string | null> { return this.manifest; }
  async read() {
    return [{
      relPath: "Resources/node.md",
      content: "---\nid: concept-1\ntipo: CONCEITO\ntitulo: Biology\nposicao: {x: 70, y: 20}\n---\n",
    }, {
      relPath: "Resources/card.md",
      content: "---\nid: card-1\ntipo: FLASHCARD\nrelacoes: [{rel: TESTA, alvo: concept-1, peso: 0.8}]\n---\n",
    }];
  }
}

describe("openGraphFromVault", () => {
  it("reads a renamed legacy graph by ID without a server or renderer cache", async () => {
    const graph = await openGraphFromVault("g1", new FakeGraphVaultFiles());
    expect(graph?.info.nome).toBe("renamed");
    expect(graph?.nodes[0]).toMatchObject({ id: "concept-1", posicaoX: 70, posicaoY: 20 });
    expect(graph?.edges).toEqual([{ source: "card-1", target: "concept-1", type: "TESTA", peso: 0.8 }]);
  });

  it("uses the stored name, parent and viewport independently of the folder name", async () => {
    const files = new FakeGraphVaultFiles();
    files.manifest = JSON.stringify({
      version: 1, id: "g1", name: "Biologia", parentId: "parent", parentName: "Main graph",
      visual: { zoom: 2, pan: { x: 12, y: 20 } },
    });
    const graph = await openGraphFromVault("g1", files);
    expect(graph?.info).toMatchObject({ nome: "Biologia", parentGrafoId: "parent", parentNome: "Main graph" });
    expect(graph?.visual).toEqual({ zoom: 2, pan: { x: 12, y: 20 } });
  });

  it("does not substitute another graph when the requested ID is missing", async () => {
    await expect(openGraphFromVault("missing", new FakeGraphVaultFiles())).resolves.toBeNull();
  });

});

describe("listLocalGraphs", () => {
  it("lists the graph by stable ID even without a manifest or remote session", async () => {
    await expect(listLocalGraphs(new FakeGraphVaultFiles())).resolves.toEqual([
      expect.objectContaining({ id: "g1", nome: "renamed" }),
    ]);
  });
});
