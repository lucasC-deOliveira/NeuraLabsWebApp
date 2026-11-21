import { describe, expect, it } from "vitest";
import { parseNode, serializeNode } from "@/lib/vault-format";
import type { VaultFile, VaultGraphFolder, VaultGraphMarkdownWrite } from "@/lib/vault-bridge";
import { updateNode } from "../../application/use-cases/update-node";
import { makeVaultGraphNodeEditor, prepareVaultNodeEdit, type VaultNodeFiles } from "./graph-vault-nodes";

class FakeGraphNodeFiles implements VaultNodeFiles {
  copy: string | null = null;
  content = "---\nid: node-1\ntipo: CONCEITO\ngrafo: graph-1\ntitulo: Before\ntags: [custom]\n"
    + "posicao: {x: 5, y: 8}\nrelacoes: [{rel: IS_A, alvo: '[[parent]]', peso: 1}]\n---\n\nOld body\n";

  async listGraphFolders(): Promise<VaultGraphFolder[]> {
    const folders = [{ id: "graph-1", directory: "vault/graph-1", label: "Graph", modifiedAt: "" }];
    if (this.copy !== null) folders.push({ id: "graph-2", directory: "vault/graph-2", label: "Second", modifiedAt: "" });
    return folders;
  }

  async read(dir: string): Promise<VaultFile[]> {
    const content = dir === "vault/graph-2" ? this.copy : this.content;
    return content === null ? [] : [{ relPath: "Resources/unrenamed--node-1.md", content }];
  }

  async readFile(): Promise<string | null> {
    return null;
  }

  async replaceGraphMarkdownBatch(writes: VaultGraphMarkdownWrite[]): Promise<boolean> {
    if (writes.some(({ dir, expected }) => expected !== (dir === "vault/graph-2" ? this.copy : this.content))) return false;
    for (const { dir, next } of writes) {
      if (dir === "vault/graph-2") this.copy = next;
      else this.content = next;
    }
    return true;
  }
}

const edit = { grafoId: "graph-1", group: "CONCEITO", nodeId: "node-1", fields: { nome: " After ", descricao: "" } };

describe("vault graph node editor", () => {
  it("previews the affected vault graphs and rejects a save if membership changed", async () => {
    const files = new FakeGraphNodeFiles();
    const prepared = prepareVaultNodeEdit(files, edit.grafoId, null, edit.group, edit.nodeId);
    await prepared.editor.getNodeDetails(edit.group, edit.nodeId);
    expect(await prepared.loadImpact?.()).toEqual([{ id: "graph-1", name: "Graph" }]);
    files.copy = files.content.replace("graph-1", "graph-2");

    await expect(updateNode(prepared.editor, edit)).rejects.toThrow("mudaram");
    expect(parseNode(files.content)?.nome).toBe("Before");
    expect(parseNode(files.copy)?.nome).toBe("Before");
  });

  it("propagates changed fields to another graph while preserving its local metadata", async () => {
    const files = new FakeGraphNodeFiles();
    files.copy = files.content.replace("graph-1", "graph-2").replace("x: 5", "x: 30").replace("parent", "other-parent");
    const editor = makeVaultGraphNodeEditor(files, edit.grafoId);
    await editor.getNodeDetails(edit.group, edit.nodeId);
    await updateNode(editor, edit);
    expect(parseNode(files.copy ?? "")).toMatchObject({
      nome: "After", descricao: null, grafoId: "graph-2", posicaoX: 30,
      relacoes: [{ rel: "IS_A", alvo: "other-parent", peso: 1 }],
    });
  });

  it("keeps both copies intact when the same field has diverged", async () => {
    const files = new FakeGraphNodeFiles();
    files.copy = files.content.replace("graph-1", "graph-2").replace("Before", "Edited elsewhere");
    const original = [files.content, files.copy];
    const editor = makeVaultGraphNodeEditor(files, edit.grafoId);
    await editor.getNodeDetails(edit.group, edit.nodeId);
    await expect(updateNode(editor, edit)).rejects.toThrow("Uma cópia");
    expect([files.content, files.copy]).toEqual(original);
  });

  it("edits node fields and preserves identity, metadata and relations", async () => {
    const files = new FakeGraphNodeFiles();
    const editor = makeVaultGraphNodeEditor(files, edit.grafoId);
    expect(await editor.getNodeDetails(edit.group, edit.nodeId)).toEqual({ nome: "Before", descricao: "Old body" });
    await updateNode(editor, edit);
    expect(parseNode(files.content)).toMatchObject({
      id: "node-1", nome: "After", descricao: null, posicaoX: 5, posicaoY: 8,
      relacoes: [{ rel: "IS_A", alvo: "parent", peso: 1 }],
    });
    expect(files.content).toContain("- custom");
  });

  it("rejects a save when the file has changed since loading the form", async () => {
    const files = new FakeGraphNodeFiles();
    const editor = makeVaultGraphNodeEditor(files, edit.grafoId);
    await editor.getNodeDetails(edit.group, edit.nodeId);
    files.content = files.content.replace("Old body", "Edited in Obsidian");
    await expect(updateNode(editor, edit)).rejects.toThrow("O arquivo mudou");
    expect(files.content).toContain("Edited in Obsidian");
  });

  it("round-trips flashcard content through the existing edit use case", async () => {
    const files = new FakeGraphNodeFiles();
    const { grafoId, nodeId } = edit;
    files.content = serializeNode({
      id: nodeId, grafoId, tipo: "FLASHCARD", pergunta: "Old question", resposta: "Old answer", relacoes: [],
    });
    const editor = makeVaultGraphNodeEditor(files, grafoId);
    expect(await editor.getNodeDetails("FLASHCARD", nodeId)).toEqual({ pergunta: "Old question", resposta: "Old answer" });
    const fields = { pergunta: "New question", resposta: "New answer\n\nMore details" };
    await updateNode(editor, { grafoId, nodeId, group: "FLASHCARD", fields });
    expect(parseNode(files.content)).toMatchObject(fields);
  });
});
