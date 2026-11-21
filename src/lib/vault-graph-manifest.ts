import { z } from "zod";
import { desktop, type VaultGraphFolder } from "./vault-bridge";

export const VAULT_GRAPH_MANIFEST = ".neuralabs-graph.json";

const manifestSchema = z.object({
  version: z.literal(1), id: z.string(), name: z.string().min(1),
  publication: z.enum(["pending", "published"]).optional(),
  description: z.string().optional(),
  parentId: z.string().nullable().optional(), parentName: z.string().nullable().optional(),
  parentRelation: z.string().nullable().optional(), childCount: z.number().optional(),
  visual: z.object({ zoom: z.number(), pan: z.object({ x: z.number(), y: z.number() }) }).optional(),
});

export type VaultGraphManifest = z.infer<typeof manifestSchema>;

/** Reads a graph manifest when available, allowing legacy folders to open without it.
 * @example const manifest = decodeVaultGraphManifest(raw, graphId)
 */
export function decodeVaultGraphManifest(raw: string | null, graphId: string): VaultGraphManifest | null {
  if (!raw) return null;
  try {
    const parsed = manifestSchema.safeParse(JSON.parse(raw));
    return parsed.success && parsed.data.id === graphId ? parsed.data : null;
  } catch {
    return null;
  }
}

/** Picks a stable graph folder by identity, even if its label changed.
 * @example const folder = findVaultGraphFolder(folders, graphId)
 */
export function findVaultGraphFolder(folders: VaultGraphFolder[], graphId: string): VaultGraphFolder | undefined {
  return folders.filter((folder) => folder.id === graphId)
    .sort((left, right) => right.modifiedAt.localeCompare(left.modifiedAt) || left.directory.localeCompare(right.directory))[0];
}

/** Resolves a previously downloaded graph's directory for study and file watching.
 * @example const dir = await existingVaultGraphDirectory(grafoId)
 */
export async function existingVaultGraphDirectory(graphId: string): Promise<string | undefined> {
  try {
    return findVaultGraphFolder(await desktop.vault.listGraphFolders(), graphId)?.directory;
  } catch {
    return undefined;
  }
}
