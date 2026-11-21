import { describe, expect, it } from "vitest";
import type { VaultFile, VaultGraphFolder, VaultGraphMarkdownWrite } from "@/lib/vault-bridge";
import { parseNode, serializeNode } from "@/lib/vault-format";
import { createGraphNode, createDeck } from "../../application/use-cases/create-graph-node";
import { EMPTY_CREATE_NODE_FORM } from "../../domain/services/create-node-schema";
import { makeVaultGraphNodeCreation, type VaultNodeCreationFiles } from "./create-vault-graph-node";

class FakeNodeCreationFiles implements VaultNodeCreationFiles {
  files = new Map<string, string>();

  async listGraphFolders(): Promise<VaultGraphFolder[]> {
    return [{ id: "g1", directory: "vault/g1", label: "Biology", modifiedAt: "" }];
  }

  async read(): Promise<VaultFile[]> {
    return [...this.files].map(([relPath, content]) => ({ relPath, content }));
  }

  async write(_directory: string, files: VaultFile[]): Promise<{ written: number }> {
    for (const { relPath, content } of files) this.files.set(relPath, content);
    return { written: files.length };
  }

  async replaceGraphMarkdownBatch(writes: VaultGraphMarkdownWrite[]): Promise<boolean> {
    if (writes.some(({ relPath, expected }) => this.files.get(relPath) !== expected)) return false;
    for (const { relPath, next } of writes) this.files.set(relPath, next);
    return true;
  }
}

describe("vault graph node creation", () => {
  it("creates a concept and its requested relationship through the existing use case", async () => {
    const files = new FakeNodeCreationFiles();
    files.files.set("Resources/cell--topic.md", serializeNode({
      id: "topic", grafoId: "g1", tipo: "TOPICO", nome: "Cell", relacoes: [],
    }));
    const port = makeVaultGraphNodeCreation(files, () => "new-node");
    const result = await createGraphNode(port, {
      grafoId: "g1", type: "CONCEITO", form: { ...EMPTY_CREATE_NODE_FORM, nome: "Mitose", descricao: "Cell division" },
      conceitoTopicos: [{ topicoId: "topic", relacao: "PERTENCE_A", peso: 1 }],
      topicoAssuntos: [], flashcardConceitos: [], notaConceitos: [], acceptedSuggestions: [], notaTextoBrutoId: "",
    });
    expect(result).toEqual({ nodeId: "new-node", createdEdges: 1 });
    expect(parseNode(files.files.get("Resources/mitose--new-node.md") ?? "")).toMatchObject({
      id: "new-node", grafoId: "g1", nome: "Mitose", descricao: "Cell division",
      relacoes: [{ alvo: "topic", rel: "PERTENCE_A", peso: 1 }],
    });
  });

  it("writes deck membership with the new deck Markdown", async () => {
    const files = new FakeNodeCreationFiles();
    files.files.set("Resources/card--card1.md", serializeNode({
      id: "card1", grafoId: "g1", tipo: "FLASHCARD", pergunta: "Question", resposta: "Answer", relacoes: [],
    }));
    const port = makeVaultGraphNodeCreation(files, () => "deck1");
    await expect(createDeck(port, "g1", "Study", ["card1"])).resolves.toBe("deck1");
    expect(parseNode(files.files.get("Projects/study--deck1.md") ?? "")).toMatchObject({
      tipo: "BARALHO", relacoes: [{ alvo: "card1", rel: "CONTEM", peso: 1 }],
    });
  });
});
