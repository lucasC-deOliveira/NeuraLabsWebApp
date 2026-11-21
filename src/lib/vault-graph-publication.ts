import { desktop, type VaultSyncState } from "./vault-bridge";
import { registerVaultGraph, getGrafoInfo } from "./graph-api";
import { decodeVaultGraphManifest, VAULT_GRAPH_MANIFEST, type VaultGraphManifest } from "./vault-graph-manifest";

const LOCAL_GRAPH_UUID = /^[a-f0-9]{8}-[a-f0-9]{4}-4[a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/i;

/** Finds graphs created locally, including those written before the marker existed.
 * @example pendingVaultGraph(manifest, syncState)
 */
export function pendingVaultGraph(manifest: VaultGraphManifest | null, syncState: VaultSyncState | null): boolean {
  if (!manifest || !LOCAL_GRAPH_UUID.test(manifest.id)) return false;
  if (manifest.publication) return manifest.publication === "pending";
  return !manifest.parentId && !syncState?.lastPull && !syncState?.lastPush;
}

/** Reads the manifest eligible for its first explicit Push.
 * @example const pending = await readPendingVaultGraph(directory, graphId)
 */
export async function readPendingVaultGraph(dir: string, id: string): Promise<VaultGraphManifest | null> {
  const [raw, state] = await Promise.all([
    desktop.vault.readFile(dir, VAULT_GRAPH_MANIFEST), desktop.vault.readSyncState(dir),
  ]);
  const manifest = decodeVaultGraphManifest(raw, id);
  return pendingVaultGraph(manifest, state) ? manifest : null;
}

/** Reserves the same graph identity on the server before uploading its contents.
 * @example await registerLocalVaultGraph(manifest)
 */
export async function registerLocalVaultGraph(manifest: VaultGraphManifest): Promise<void> {
  const registered = await registerVaultGraph(manifest.id, manifest.name, manifest.description);
  if (registered.id !== manifest.id) throw new Error("O servidor não preservou o identificador do grafo local.");
}

/** Records the server hierarchy after the graph contents are accepted.
 * @example await completeVaultGraphPublication(dir, manifest)
 */
export async function completeVaultGraphPublication(dir: string, manifest: VaultGraphManifest): Promise<void> {
  const graph = await getGrafoInfo(manifest.id);
  if (!graph?.parentGrafoId) throw new Error("O servidor recebeu o grafo, mas o vínculo com Meu Conhecimento ainda não foi confirmado.");
  const published: VaultGraphManifest = {
    ...manifest, publication: "published", parentId: graph.parentGrafoId,
    parentName: graph.parentNome, parentRelation: graph.tipoRelacaoPai, childCount: graph.filhosCount,
  };
  await desktop.vault.writeFile(dir, VAULT_GRAPH_MANIFEST, JSON.stringify(published, null, 2) + "\n");
}
