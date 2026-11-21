import type { VaultFile, VaultGraphFolder } from "@/lib/vault-bridge";
import { decodeVaultGraphManifest, VAULT_GRAPH_MANIFEST } from "@/lib/vault-graph-manifest";
import type { LoadRelationImpact, RelationEndpoints, RelationImpactGraph } from "../../application/ports/relation-impact.port";
import { graphVaultEntries } from "./graph-vault-reader";

export interface VaultRelationImpactFiles {
  listGraphFolders(): Promise<VaultGraphFolder[]>;
  read(dir: string): Promise<VaultFile[]>;
  readFile(dir: string, relPath: string): Promise<string | null>;
}

async function affectedGraph(files: VaultRelationImpactFiles, folder: VaultGraphFolder, edge: RelationEndpoints): Promise<RelationImpactGraph | null> {
  const entries = graphVaultEntries(await files.read(folder.directory), folder.id);
  const nodeIds = new Set(entries.map(({ node }) => node.id));
  if (!nodeIds.has(edge.source) || !nodeIds.has(edge.target)) return null;
  const manifest = await files.readFile(folder.directory, VAULT_GRAPH_MANIFEST);
  return { id: folder.id, name: decodeVaultGraphManifest(manifest, folder.id)?.name ?? folder.label };
}

/** Finds the vault graphs that contain both ends of a shared relation.
 * @example const graphs = await vaultRelationImpact(desktop.vault)(edge)
 */
export function vaultRelationImpact(files: VaultRelationImpactFiles): LoadRelationImpact {
  return async (edge): Promise<RelationImpactGraph[]> => {
    const folders = await files.listGraphFolders();
    const matches = await Promise.all(folders.map((folder) => affectedGraph(files, folder, edge)));
    const graphs = matches.filter((entry): entry is RelationImpactGraph => entry !== null);
    return [...new Map(graphs.map((entry) => [entry.id, entry])).values()];
  };
}
