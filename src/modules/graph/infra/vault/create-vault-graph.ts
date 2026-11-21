import type { VaultFile } from "@/lib/vault-bridge";
import { VAULT_GRAPH_MANIFEST, type VaultGraphManifest } from "@/lib/vault-graph-manifest";
import { buildVaultGuide, VAULT_GUIDE_FILENAME } from "@/lib/vault-guide";
import { graphVaultDir } from "@/lib/vault-sync";

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
  const manifest: VaultGraphManifest = { version: 1, id, name: name.trim(), publication: "pending" };
  if (!manifest.name) throw new Error("Informe um nome para o grafo.");
  const directory = graphVaultDir(vaultPath, id, manifest.name);
  const graphFiles = [
    { relPath: VAULT_GUIDE_FILENAME, content: buildVaultGuide() },
    { relPath: VAULT_GRAPH_MANIFEST, content: JSON.stringify(manifest, null, 2) + "\n" },
  ];
  const result = await files.write(directory, graphFiles);
  if (result.written !== graphFiles.length) throw new Error("Não foi possível gravar o grafo no vault.");
  return { id };
}
