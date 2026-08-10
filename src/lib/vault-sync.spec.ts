import { describe, it, expect, vi, beforeEach } from "vitest";
import { graphVaultDir, getSyncState, getModifiedCount, compareSyncState, fromVaultNode, removeOrphans } from "./vault-sync";
import { serializeNode, parseNode } from "./vault-format";
import type { ExportGraphNode } from "./graph-api";

describe("graphVaultDir", () => {
  it("monta <base>/<slug>--<id>", () => {
    expect(graphVaultDir("/vault", "abc-123", "Algoritmos")).toBe("/vault/algoritmos--abc-123");
  });

  it("slugifica o nome do grafo", () => {
    expect(graphVaultDir("/vault", "x1", "Fisiologia Humana")).toBe("/vault/fisiologia-humana--x1");
  });

  it("remove acentos do nome do grafo", () => {
    expect(graphVaultDir("/vault", "x2", "Álgebra Linear")).toBe("/vault/algebra-linear--x2");
  });

  it("grafos diferentes produzem subpastas diferentes", () => {
    const a = graphVaultDir("/vault", "id-1", "Matemática");
    const b = graphVaultDir("/vault", "id-2", "Matemática");
    expect(a).not.toBe(b);
  });

  it("mesmo grafo com bases diferentes produz caminhos diferentes", () => {
    const a = graphVaultDir("/vault-a", "id-1", "Grafo");
    const b = graphVaultDir("/vault-b", "id-1", "Grafo");
    expect(a).not.toBe(b);
  });
});

// Mocks da ponte desktop e graph-api (não disponíveis no ambiente de teste)
vi.mock("./vault-bridge", () => ({
  desktop: {
    vault: {
      readSyncState: vi.fn(),
      writeSyncState: vi.fn(),
      checkModified: vi.fn(),
      getPath: vi.fn(),
      pickFolder: vi.fn(),
      read: vi.fn(),
      write: vi.fn(),
      openFolder: vi.fn(),
      deleteFiles: vi.fn(),
    },
  },
  isDesktop: () => false,
}));

vi.mock("./graph-api", () => ({
  exportGraph: vi.fn(),
  syncGraphFromVault: vi.fn(),
}));

import { desktop } from "./vault-bridge";
import { exportGraph } from "./graph-api";

// Helper: cria um .md de conceito mínimo para os testes de compareSyncState
function makeConceptMd(id: string, nome: string, grafoId = "grafo-1") {
  return `---
id: "${id}"
tipo: CONCEITO
grafo: "${grafoId}"
titulo: "${nome}"
relacoes: []
---

${nome}
`;
}

describe("getSyncState", () => {
  beforeEach(() => vi.clearAllMocks());

  it("retorna estado quando a bridge responde com dados", async () => {
    vi.mocked(desktop.vault.readSyncState).mockResolvedValueOnce({
      lastPull: "2024-01-15T10:00:00.000Z",
      lastPush: "2024-01-15T11:00:00.000Z",
    });
    const state = await getSyncState("/vault/grafo--id1");
    expect(state).toEqual({ lastPull: "2024-01-15T10:00:00.000Z", lastPush: "2024-01-15T11:00:00.000Z" });
    expect(desktop.vault.readSyncState).toHaveBeenCalledWith("/vault/grafo--id1");
  });

  it("retorna null quando a bridge retorna null (sem sync ainda)", async () => {
    vi.mocked(desktop.vault.readSyncState).mockResolvedValueOnce(null);
    const state = await getSyncState("/vault/grafo--id1");
    expect(state).toBeNull();
  });

  it("retorna null quando a bridge lança erro", async () => {
    vi.mocked(desktop.vault.readSyncState).mockRejectedValueOnce(new Error("fs error"));
    const state = await getSyncState("/vault/grafo--id1");
    expect(state).toBeNull();
  });
});

describe("getModifiedCount", () => {
  beforeEach(() => vi.clearAllMocks());

  it("retorna o número de arquivos modificados", async () => {
    vi.mocked(desktop.vault.checkModified).mockResolvedValueOnce({ count: 3, files: ["a.md", "b.md", "c.md"] });
    const count = await getModifiedCount("/vault/grafo--id1", "2024-01-15T10:00:00.000Z");
    expect(count).toBe(3);
    expect(desktop.vault.checkModified).toHaveBeenCalledWith("/vault/grafo--id1", "2024-01-15T10:00:00.000Z");
  });

  it("retorna 0 quando não há arquivos modificados", async () => {
    vi.mocked(desktop.vault.checkModified).mockResolvedValueOnce({ count: 0, files: [] });
    const count = await getModifiedCount("/vault/grafo--id1", "2024-01-15T10:00:00.000Z");
    expect(count).toBe(0);
  });

  it("retorna 0 quando a bridge lança erro", async () => {
    vi.mocked(desktop.vault.checkModified).mockRejectedValueOnce(new Error("ipc error"));
    const count = await getModifiedCount("/vault/grafo--id1", "2024-01-15T10:00:00.000Z");
    expect(count).toBe(0);
  });
});

describe("compareSyncState", () => {
  beforeEach(() => vi.clearAllMocks());

  const backendExport = (nodes: { ref: string; nome: string }[]) => ({
    grafo: { id: "grafo-1", nome: "Grafo" },
    nodes: nodes.map((n) => ({ ref: n.ref, tipo: "CONCEITO", nome: n.nome })),
    edges: [],
  });

  it("vault vazio + backend com nós → vaultEmpty=true, backendOnly=N", async () => {
    vi.mocked(desktop.vault.read).mockResolvedValueOnce([]);
    vi.mocked(exportGraph).mockResolvedValueOnce(backendExport([{ ref: "id-1", nome: "A" }]) as any);

    const diff = await compareSyncState("grafo-1", "/vault/grafo--id1");
    expect(diff.vaultEmpty).toBe(true);
    expect(diff.backendOnly).toBe(1);
    expect(diff.inSync).toBe(false);
  });

  it("vault vazio + backend vazio → inSync=true, vaultEmpty=true", async () => {
    vi.mocked(desktop.vault.read).mockResolvedValueOnce([]);
    vi.mocked(exportGraph).mockResolvedValueOnce(backendExport([]) as any);

    const diff = await compareSyncState("grafo-1", "/vault/grafo--id1");
    expect(diff.vaultEmpty).toBe(true);
    expect(diff.inSync).toBe(true);
  });

  it("backend e vault sincronizados → inSync=true", async () => {
    vi.mocked(desktop.vault.read).mockResolvedValueOnce([
      { relPath: "Resources/a--id-1.md", content: makeConceptMd("id-1", "Algoritmo") },
    ]);
    vi.mocked(exportGraph).mockResolvedValueOnce(
      backendExport([{ ref: "id-1", nome: "Algoritmo" }]) as any,
    );

    const diff = await compareSyncState("grafo-1", "/vault/grafo--id1");
    expect(diff.inSync).toBe(true);
    expect(diff.different).toBe(0);
  });

  it("nó só no backend → backendOnly=1, vaultOnly=0", async () => {
    vi.mocked(desktop.vault.read).mockResolvedValueOnce([
      { relPath: "Resources/a--id-1.md", content: makeConceptMd("id-1", "A") },
    ]);
    vi.mocked(exportGraph).mockResolvedValueOnce(
      backendExport([{ ref: "id-1", nome: "A" }, { ref: "id-2", nome: "B" }]) as any,
    );

    const diff = await compareSyncState("grafo-1", "/vault/grafo--id1");
    expect(diff.backendOnly).toBe(1);
    expect(diff.vaultOnly).toBe(0);
    expect(diff.inSync).toBe(false);
  });

  it("nó só no vault → vaultOnly=1, backendOnly=0", async () => {
    vi.mocked(desktop.vault.read).mockResolvedValueOnce([
      { relPath: "Resources/a--id-1.md", content: makeConceptMd("id-1", "A") },
      { relPath: "Resources/b--id-2.md", content: makeConceptMd("id-2", "B") },
    ]);
    vi.mocked(exportGraph).mockResolvedValueOnce(
      backendExport([{ ref: "id-1", nome: "A" }]) as any,
    );

    const diff = await compareSyncState("grafo-1", "/vault/grafo--id1");
    expect(diff.vaultOnly).toBe(1);
    expect(diff.backendOnly).toBe(0);
    expect(diff.inSync).toBe(false);
  });

  it("mesmo nó com nome diferente → different=1 (conflito)", async () => {
    vi.mocked(desktop.vault.read).mockResolvedValueOnce([
      { relPath: "Resources/a--id-1.md", content: makeConceptMd("id-1", "Nome no Vault") },
    ]);
    vi.mocked(exportGraph).mockResolvedValueOnce(
      backendExport([{ ref: "id-1", nome: "Nome no Backend" }]) as any,
    );

    const diff = await compareSyncState("grafo-1", "/vault/grafo--id1");
    expect(diff.different).toBe(1);
    expect(diff.backendOnly).toBe(0);
    expect(diff.vaultOnly).toBe(0);
    expect(diff.inSync).toBe(false);
  });

  it("vault:read lança erro → trata como vault vazio", async () => {
    vi.mocked(desktop.vault.read).mockRejectedValueOnce(new Error("pasta não existe"));
    vi.mocked(exportGraph).mockResolvedValueOnce(
      backendExport([{ ref: "id-1", nome: "A" }]) as any,
    );

    const diff = await compareSyncState("grafo-1", "/vault/grafo--id1");
    expect(diff.vaultEmpty).toBe(true);
    expect(diff.backendOnly).toBe(1);
  });

  it("ignora o AGENTS.md na contagem do vault", async () => {
    vi.mocked(desktop.vault.read).mockResolvedValueOnce([
      { relPath: "Resources/a--id-1.md", content: makeConceptMd("id-1", "A") },
      { relPath: "AGENTS.md", content: "# guia" },
    ]);
    vi.mocked(exportGraph).mockResolvedValueOnce(
      backendExport([{ ref: "id-1", nome: "A" }]) as any,
    );

    const diff = await compareSyncState("grafo-1", "/vault/grafo--id1");
    expect(diff.inSync).toBe(true);
  });
});

// ── ida e volta Pull → arquivo → Push ─────────────────────────────────────────

// O caminho real de uma questão tem quatro traduções (export do backend →
// VaultNode → .md → payload do Push) e cada uma pode perder um campo em silêncio.
// Este teste percorre as quatro de uma vez.
describe("fromVaultNode: o Push devolve o que o Pull escreveu", () => {
  const questaoExportada: ExportGraphNode = {
    ref: "q-1",
    tipo: "QUESTION",
    enunciado: "Segundo o ITIL 4, o que é um SLA?",
    alternativas: [
      { letra: "A", texto: "Acordo entre provedor e cliente" },
      { letra: "B", texto: "Acordo entre times internos" },
    ],
    gabarito: "A",
    explicacao: "OLA é o acordo interno.",
    tipoQuestao: "MULTIPLA_ESCOLHA",
    nivelDominio: 2,
  };

  it("preserva o conteúdo da questão nas quatro traduções", () => {
    const emDisco = serializeNode({
      ...questaoExportada,
      id: questaoExportada.ref,
      tipo: "QUESTION",
      grafoId: "g1",
      relacoes: [{ rel: "TESTA", alvo: "c-9", peso: 1 }],
    });
    const doPush = fromVaultNode(parseNode(emDisco)!);

    expect(doPush.tipo).toBe("QUESTION");
    expect(doPush.enunciado).toBe(questaoExportada.enunciado);
    expect(doPush.alternativas).toEqual(questaoExportada.alternativas);
    expect(doPush.gabarito).toBe("A");
    expect(doPush.explicacao).toBe(questaoExportada.explicacao);
    expect(doPush.tipoQuestao).toBe("MULTIPLA_ESCOLHA");
  });

  it("a aresta TESTA sai do frontmatter para o payload de arestas", () => {
    const emDisco = serializeNode({
      id: "q-1",
      tipo: "QUESTION",
      grafoId: "g1",
      enunciado: "E",
      gabarito: "A",
      relacoes: [{ rel: "TESTA", alvo: "c-9", peso: 1 }],
    });
    expect(parseNode(emDisco)!.relacoes).toEqual([{ rel: "TESTA", alvo: "c-9", peso: 1 }]);
  });
});

// ── órfãos ────────────────────────────────────────────────────────────────────

// O caso real: renomear um conceito muda o id (derivado do título) e portanto o
// nome do arquivo. O gerador escreve o novo e o antigo fica para trás.
describe("compareSyncState: identificação de órfãos", () => {
  beforeEach(() => vi.clearAllMocks());

  it("aponta qual arquivo é o órfão, não só quantos", async () => {
    vi.mocked(desktop.vault.read).mockResolvedValueOnce([
      { relPath: "Resources/sla--novo.md", content: makeConceptMd("novo", "SLA") },
      { relPath: "Resources/sla-antigo--velho.md", content: makeConceptMd("velho", "SLA antigo") },
    ]);
    vi.mocked(exportGraph).mockResolvedValueOnce({
      grafo: { id: "grafo-1", nome: "G" },
      nodes: [{ ref: "novo", tipo: "CONCEITO", nome: "SLA" }],
      edges: [],
    });

    const diff = await compareSyncState("grafo-1", "/vault/g--1");

    expect(diff.vaultOnly).toBe(1);
    expect(diff.orphans).toEqual([
      { id: "velho", titulo: "SLA antigo", relPath: "Resources/sla-antigo--velho.md" },
    ]);
  });

  it("não considera órfão o que existe dos dois lados", async () => {
    vi.mocked(desktop.vault.read).mockResolvedValueOnce([
      { relPath: "Resources/sla--n1.md", content: makeConceptMd("n1", "SLA") },
    ]);
    vi.mocked(exportGraph).mockResolvedValueOnce({
      grafo: { id: "grafo-1", nome: "G" },
      nodes: [{ ref: "n1", tipo: "CONCEITO", nome: "SLA" }],
      edges: [],
    });

    const diff = await compareSyncState("grafo-1", "/vault/g--1");
    expect(diff.orphans).toEqual([]);
    expect(diff.inSync).toBe(true);
  });

  it("vault vazio não produz órfãos", async () => {
    vi.mocked(desktop.vault.read).mockResolvedValueOnce([]);
    vi.mocked(exportGraph).mockResolvedValueOnce({
      grafo: { id: "grafo-1", nome: "G" },
      nodes: [{ ref: "n1", tipo: "CONCEITO", nome: "SLA" }],
      edges: [],
    });

    const diff = await compareSyncState("grafo-1", "/vault/g--1");
    expect(diff.vaultEmpty).toBe(true);
    expect(diff.orphans).toEqual([]);
  });
});

describe("removeOrphans", () => {
  beforeEach(() => vi.clearAllMocks());

  const orfao = { id: "velho", titulo: "SLA antigo", relPath: "Resources/sla-antigo--velho.md" };

  it("manda apagar só os caminhos dos órfãos recebidos", async () => {
    vi.mocked(desktop.vault.deleteFiles).mockResolvedValueOnce({
      deleted: [orfao.relPath],
      skipped: [],
    });

    const res = await removeOrphans("/vault/g--1", [orfao]);

    expect(desktop.vault.deleteFiles).toHaveBeenCalledWith("/vault/g--1", [orfao.relPath]);
    expect(res).toEqual({ deleted: 1, skipped: [] });
  });

  // Sem a saída antecipada, uma lista vazia viraria uma chamada de exclusão sem
  // alvo — barato de evitar e uma ida ao processo main a menos.
  it("não chama a ponte quando não há órfão", async () => {
    const res = await removeOrphans("/vault/g--1", []);
    expect(desktop.vault.deleteFiles).not.toHaveBeenCalled();
    expect(res).toEqual({ deleted: 0, skipped: [] });
  });

  it("repassa o que o processo main recusou apagar", async () => {
    vi.mocked(desktop.vault.deleteFiles).mockResolvedValueOnce({
      deleted: [],
      skipped: ["Resources/travado--x.md"],
    });
    const res = await removeOrphans("/vault/g--1", [orfao]);
    expect(res).toEqual({ deleted: 0, skipped: ["Resources/travado--x.md"] });
  });
});
