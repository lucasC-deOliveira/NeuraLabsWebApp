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

  it("cria, lista, atualiza e remove aresta (CONCEITO → TOPICO)", async () => {
    const store = new MarkdownGraphStore(vault);
    const { nodeId: tId } = await store.createNode("u1", "g1", "TOPICO", { nome: "Princípios" });
    const { nodeId: cId } = await store.createNode("u1", "g1", "CONCEITO", { nome: "Legalidade" });

    // PERTENCE_A é permitida CONCEITO→TOPICO
    const { edgeId } = await store.createEdge("u1", "g1", {
      sourceNodeId: cId,
      targetNodeId: tId,
      tipoRelacao: "PERTENCE_A",
      peso: 1,
    });
    expect(edgeId).toBe(`${cId}|${tId}|PERTENCE_A`);

    let edges = await store.getEdges("u1", "g1");
    expect(edges).toHaveLength(1);
    expect(edges[0]).toMatchObject({ source: cId, target: tId, tipoRelacao: "PERTENCE_A", peso: 1, sourceLabel: "Legalidade", targetLabel: "Princípios" });

    await store.updateEdge("u1", "g1", edgeId, { peso: 1.8 });
    edges = await store.getEdges("u1", "g1");
    expect(edges[0].peso).toBe(1.8);

    await store.deleteEdge("u1", "g1", edgeId);
    expect(await store.getEdges("u1", "g1")).toHaveLength(0);
  });

  it("rejeita relação não permitida entre os tipos", async () => {
    const store = new MarkdownGraphStore(vault);
    const { nodeId: a } = await store.createNode("u1", "g1", "ASSUNTO", { nome: "A" });
    const { nodeId: c } = await store.createNode("u1", "g1", "CONCEITO", { nome: "C" });
    await expect(
      store.createEdge("u1", "g1", { sourceNodeId: a, targetNodeId: c, tipoRelacao: "PERTENCE_A", peso: 1 }),
    ).rejects.toThrow();
  });

  it("updateNode altera campos e getNodeDetails reflete", async () => {
    const store = new MarkdownGraphStore(vault);
    const { nodeId } = await store.createNode("u1", "g1", "CONCEITO", { nome: "Antigo", descricao: "x" });
    await store.updateNode("u1", "CONCEITO", nodeId, { nome: "Novo", descricao: "y" });

    const details = await store.getNodeDetails("u1", "CONCEITO", nodeId);
    expect(details).toEqual({ nome: "Novo", descricao: "y" });

    const { nodes } = await store.loadGraph("u1", "g1");
    expect(nodes[0].label).toBe("Novo");
  });

  it("deleteNode remove o arquivo e as relações de entrada", async () => {
    const store = new MarkdownGraphStore(vault);
    const { nodeId: t } = await store.createNode("u1", "g1", "TOPICO", { nome: "Tópico" });
    const { nodeId: c } = await store.createNode("u1", "g1", "CONCEITO", { nome: "Conceito" });
    await store.createEdge("u1", "g1", { sourceNodeId: c, targetNodeId: t, tipoRelacao: "PERTENCE_A", peso: 1 });

    const { deletedType } = await store.deleteNode("u1", t, "g1");
    expect(deletedType).toBe("TOPICO");

    const { nodes, edges } = await store.loadGraph("u1", "g1");
    expect(nodes.map((n) => n.id)).toEqual([c]); // só o conceito sobrou
    expect(edges).toHaveLength(0); // aresta de entrada removida do conceito
  });
});
