import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { promises as fs } from "fs";
import os from "os";
import path from "path";
import { MarkdownGraphStore } from "./markdown-graph-store";

// Slice da fase 4: cria um nó no vault e lê de volta — sem tocar no banco
// (usa tipos sem flashcard, então loadGraph não consulta o SRS).
describe("MarkdownGraphStore — createNode + loadGraph", () => {
  let vault: string;

  beforeEach(async () => {
    vault = await fs.mkdtemp(path.join(os.tmpdir(), "vault-"));
  });
  afterEach(async () => {
    await fs.rm(vault, { recursive: true, force: true });
  });

  it("grava um CONCEITO em Resources e o lê de volta", async () => {
    const store = new MarkdownGraphStore(vault);
    const { nodeId } = await store.createNode("u1", "g1", "CONCEITO", {
      nome: "Federalismo",
      descricao: "Organização do Estado.",
    });
    expect(nodeId).toBeTruthy();

    // arquivo criado em Resources/
    const resources = await fs.readdir(path.join(vault, "Resources"));
    expect(resources.some((f) => f.endsWith(`${nodeId}.md`))).toBe(true);

    const { nodes } = await store.loadGraph("u1", "g1");
    expect(nodes).toHaveLength(1);
    expect(nodes[0]).toMatchObject({ id: nodeId, label: "Federalismo", type: "CONCEITO" });
  });

  it("filtra por grafoId ao carregar", async () => {
    const store = new MarkdownGraphStore(vault);
    await store.createNode("u1", "g1", "ASSUNTO", { nome: "Direito" });
    await store.createNode("u1", "g2", "ASSUNTO", { nome: "Medicina" });

    const g1 = await store.loadGraph("u1", "g1");
    expect(g1.nodes.map((n) => n.label)).toEqual(["Direito"]);

    const all = await store.loadGraph("u1");
    expect(all.nodes).toHaveLength(2);
  });

  it("Assunto vai para Areas e Baralho para Projects", async () => {
    const store = new MarkdownGraphStore(vault);
    await store.createNode("u1", "g1", "ASSUNTO", { nome: "Direito" });
    await store.createNode("u1", "g1", "BARALHO", { titulo: "Revisão" });

    expect(await fs.readdir(path.join(vault, "Areas"))).toHaveLength(1);
    expect(await fs.readdir(path.join(vault, "Projects"))).toHaveLength(1);
  });
});
