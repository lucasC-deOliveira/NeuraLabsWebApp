import { describe, it, expect, vi, beforeEach } from "vitest";
import { graphVaultDir, getSyncState, getModifiedCount } from "./vault-sync";

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

// Mocks da ponte desktop (não disponível no ambiente de teste)
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
    },
  },
  isDesktop: () => false,
}));

import { desktop } from "./vault-bridge";

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
