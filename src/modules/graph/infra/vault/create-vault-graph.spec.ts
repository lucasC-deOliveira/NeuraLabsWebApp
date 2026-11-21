import { describe, expect, it } from "vitest";
import type { VaultFile } from "@/lib/vault-bridge";
import { decodeVaultGraphManifest, VAULT_GRAPH_MANIFEST } from "@/lib/vault-graph-manifest";
import { createVaultGraph, type VaultGraphCreationFiles } from "./create-vault-graph";

class FakeVaultGraphCreationFiles implements VaultGraphCreationFiles {
  directory = "";
  files: VaultFile[] = [];

  async write(dir: string, files: VaultFile[]): Promise<{ written: number }> {
    this.directory = dir;
    this.files = files;
    return { written: files.length };
  }
}

describe("createVaultGraph", () => {
  it("creates a discoverable empty graph in the configured vault", async () => {
    const files = new FakeVaultGraphCreationFiles();
    const result = await createVaultGraph(files, "C:/vault", "  Direito Constitucional  ", () => "local-id");
    expect(result).toEqual({ id: "local-id" });
    expect(files.directory).toBe("C:/vault/direito-constitucional--local-id");
    const manifest = files.files.find((file) => file.relPath === VAULT_GRAPH_MANIFEST);
    expect(decodeVaultGraphManifest(manifest?.content ?? null, result.id)).toEqual({
      version: 1, id: "local-id", name: "Direito Constitucional", publication: "pending",
    });
  });
});
