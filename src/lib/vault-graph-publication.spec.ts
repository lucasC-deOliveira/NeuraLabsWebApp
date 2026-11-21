import { describe, expect, it, vi } from "vitest";
import { registerVaultGraph } from "./graph-api";
import { pendingVaultGraph, registerLocalVaultGraph } from "./vault-graph-publication";
import type { VaultGraphManifest } from "./vault-graph-manifest";

vi.mock("./graph-api", () => ({ registerVaultGraph: vi.fn(), getGrafoInfo: vi.fn() }));

const local: VaultGraphManifest = { version: 1, id: "a20e47ff-3fe9-4e32-aad2-5ff22c23626c", name: "Biology" };

describe("vault graph publication", () => {
  it("recognizes legacy local graphs without treating pulled graphs as pending", () => {
    expect(pendingVaultGraph(local, null)).toBe(true);
    expect(pendingVaultGraph(local, { lastPull: "2026-11-20" })).toBe(false);
    expect(pendingVaultGraph({ ...local, publication: "published" }, null)).toBe(false);
    expect(pendingVaultGraph({ ...local, id: "server-cuid" }, null)).toBe(false);
  });

  it("requires the server to register the same graph identity", async () => {
    vi.mocked(registerVaultGraph).mockResolvedValueOnce({ id: "new-server-id" });
    await expect(registerLocalVaultGraph(local)).rejects.toThrow("identificador");
    expect(registerVaultGraph).toHaveBeenCalledWith(local.id, local.name, undefined);
  });
});
