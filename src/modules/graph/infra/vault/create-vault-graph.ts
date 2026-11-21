import type { VaultFile } from "@/lib/vault-bridge";
import { sharedGraphMetadataDir, VAULT_GRAPH_MANIFEST, type VaultGraphManifest } from "@/lib/vault-graph-manifest";
import { buildSharedVaultGuide, VAULT_GUIDE_FILENAME } from "@/lib/vault-guide";

export interface VaultGraphCreationFiles {
  write(dir: string, files: VaultFile[]): Promise<{ written: number }>;
}

/** Creates a discoverable local graph before it has any nodes.
 * @example await createVaultGraph(desktop.vault, vaultPath, "Biologia")
 */
export async function createVaultGraph(
  files: VaultGraphCreationFiles, vaultPath: string, name: string, nextId = (): string => crypto.randomUUID(),
): Promise<{ id: string }> {
  const id = nextId();
  const manifest: VaultGraphManifest = { version: 1, id, name: name.trim(), publication: "pending", layout: "shared-para" };
  if (!manifest.name) throw new Error("Informe um nome para o grafo.");
  const directory = sharedGraphMetadataDir(vaultPath, id);
  const graphFiles = [
    { relPath: VAULT_GUIDE_FILENAME, content: buildSharedVaultGuide() },
    { relPath: VAULT_GRAPH_MANIFEST, content: JSON.stringify(manifest, null, 2) + "\n" },
  ];
  const result = await files.write(directory, graphFiles);
  if (result.written !== graphFiles.length) throw new Error("Não foi possível gravar o grafo no vault.");
  return { id };
}
