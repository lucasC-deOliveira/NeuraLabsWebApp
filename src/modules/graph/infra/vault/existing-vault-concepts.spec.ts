import { describe, expect, it } from "vitest";
import type { VaultFile, VaultGraphFolder } from "@/lib/vault-bridge";
import { parseNode, serializeNode } from "@/lib/vault-format";
import { vaultToGraphEdges } from "@/lib/vault-sync";
import { attachVaultConcept, listExistingVaultConcepts, type VaultConceptFiles } from "./existing-vault-concepts";

class FakeVaultConceptFiles implements VaultConceptFiles {
  private readonly documents = new Map<string, VaultFile[]>([
    ["source", [{
      relPath: "Resources/mitosis--c1.md",
      content: serializeNode({
        id: "c1", grafoId: "source", tipo: "CONCEITO", nome: "Mitosis", descricao: "Cell division",
        posicaoX: 80, pesoEdital: 2, relacoes: [{ rel: "PERTENCE_A", alvo: "topic", peso: 1 }],
      }),
    }]],
    ["target", []],
  ]);

  async listGraphFolders(): Promise<VaultGraphFolder[]> {
    return [...this.documents.keys()].map((id) => ({ id, directory: id, label: id, modifiedAt: "" }));
  }

  async read(dir: string): Promise<VaultFile[]> {
    return this.documents.get(dir) ?? [];
  }

  async write(dir: string, files: VaultFile[]): Promise<{ written: number }> {
    this.documents.set(dir, [...await this.read(dir), ...files]);
    return { written: files.length };
  }
}

describe("existing vault concepts", () => {
  it("links the same concept once and leaves the source graph metadata in its own copy", async () => {
    const files = new FakeVaultConceptFiles();
    expect(await listExistingVaultConcepts(files, "target")).toMatchObject([{ id: "c1", label: "Mitosis" }]);
    await attachVaultConcept(files, "target", "c1");
    await attachVaultConcept(files, "target", "c1");
    const target = await files.read("target");
    expect(target).toHaveLength(1);
    const node = parseNode(target[0].content)!;
    expect(node).toMatchObject({
      id: "c1", grafoId: "target", descricao: "Cell division", posicaoX: null, pesoEdital: null,
    });
    expect(vaultToGraphEdges([node])).toEqual([]);
    expect(await listExistingVaultConcepts(files, "target")).toEqual([]);
  });
});
