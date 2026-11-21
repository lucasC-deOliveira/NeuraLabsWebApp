import { describe, expect, it } from "vitest";
import { parseNode, serializeNode } from "@/lib/vault-format";
import type { VaultFile, VaultGraphFolder, VaultGraphMarkdownWrite } from "@/lib/vault-bridge";
import { makeVaultGraphEdges, type VaultEdgeFiles } from "./graph-vault-edges";

class FakeVaultEdgeFiles implements VaultEdgeFiles {
  rejectWrite = false;

  private readonly markdown = new Map([
    ["Areas/a.md", serializeNode({ id: "a", grafoId: "g1", tipo: "CONCEITO", nome: "A", descricao: "Keep this", relacoes: [] })],
    ["Resources/b.md", serializeNode({ id: "b", grafoId: "g1", tipo: "TOPICO", nome: "B", relacoes: [] })],
  ]);
  private readonly graphs = new Map([["g1", this.markdown]]);

  addGraph(id: string, includeTarget: boolean, weight?: number): void {
    const files = new Map(this.markdown);
    for (const [path, content] of files) {
      const node = parseNode(content)!;
      const links = node.id === "a" && weight !== undefined ? [{ rel: "PERTENCE_A", alvo: "b", peso: weight }] : [];
      if (includeTarget || node.id === "a") files.set(path, serializeNode({ ...node, grafoId: id, relacoes: links }));
      else files.delete(path);
    }
    this.graphs.set(id, files);
  }

  async listGraphFolders(): Promise<VaultGraphFolder[]> {
    return [...this.graphs.keys()].map((id) => ({ id, directory: id, label: id, modifiedAt: "" }));
  }

  async read(dir = "g1"): Promise<VaultFile[]> {
    return [...this.graphs.get(dir)!].map(([relPath, content]) => ({ relPath, content }));
  }

  async replaceGraphMarkdownBatch(writes: VaultGraphMarkdownWrite[]): Promise<boolean> {
    if (this.rejectWrite || writes.some(({ dir, relPath, expected }) => this.graphs.get(dir)?.get(relPath) !== expected)) return false;
    for (const { dir, relPath, next } of writes) this.graphs.get(dir)?.set(relPath, next);
    return true;
  }
}

const relation = { sourceNodeId: "a", targetNodeId: "b", tipoRelacao: "PERTENCE_A", peso: 1 };

describe("vault graph relationships", () => {
  it("creates, edits and removes a relationship in the source Markdown", async () => {
    const files = new FakeVaultEdgeFiles();
    const edges = makeVaultGraphEdges(files);
    const { edgeId } = await edges.createEdge("g1", relation);
    await edges.updateEdge(edgeId, "g1", { peso: 0.5 });
    const [source] = await files.read();
    expect(parseNode(source.content)).toMatchObject({
      descricao: "Keep this",
      relacoes: [{ rel: "PERTENCE_A", alvo: "b", peso: 0.5 }],
    });
    await edges.deleteEdge(edgeId, "g1");
    const [updated] = await files.read();
    expect(parseNode(updated.content)?.relacoes).toEqual([]);
  });

  it("updates shared relations only in views that contain both nodes and clears old dangling copies", async () => {
    const files = new FakeVaultEdgeFiles();
    files.addGraph("g2", true);
    files.addGraph("g3", false);
    const edges = makeVaultGraphEdges(files);
    const { edgeId } = await edges.createEdge("g1", relation);
    expect(parseNode((await files.read("g3"))[0].content)?.relacoes).toEqual([]);
    await edges.updateEdge(edgeId, "g2", { peso: 1.5 });
    expect(parseNode((await files.read())[0].content)?.relacoes[0]?.peso).toBe(1.5);
    files.addGraph("g4", false, 1.5);
    await edges.deleteEdge(edgeId, "g1");
    expect(parseNode((await files.read("g2"))[0].content)?.relacoes).toEqual([]);
    expect(parseNode((await files.read("g4"))[0].content)?.relacoes).toEqual([]);
  });

  it("rejects zero and rejects divergent replicas before writing", async () => {
    const files = new FakeVaultEdgeFiles();
    const edges = makeVaultGraphEdges(files);
    await expect(edges.createEdge("g1", { ...relation, peso: 0 })).rejects.toThrow("maior que 0");
    files.addGraph("g2", true, 1.8);
    await expect(edges.createEdge("g1", relation)).rejects.toThrow("versão diferente");
    expect(parseNode((await files.read())[0].content)?.relacoes).toEqual([]);
  });

  it("leaves Markdown intact when the stored file changes before the write", async () => {
    const files = new FakeVaultEdgeFiles();
    const edges = makeVaultGraphEdges(files);
    const before = await files.read();
    files.rejectWrite = true;
    await expect(edges.createEdge("g1", relation)).rejects.toThrow("O arquivo mudou");
    expect(await files.read()).toEqual(before);
  });
});
