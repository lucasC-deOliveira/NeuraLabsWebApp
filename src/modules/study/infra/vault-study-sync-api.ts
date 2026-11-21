import { apiFetch } from "@/lib/api";
import { vaultStudySyncResponse, type VaultStudySyncRequest, type VaultStudySyncResponse } from "@contracts/vault-study-sync";

/** Validates acknowledgments before allowing any update to the local review log.
 * @example const result = await syncVaultStudyBatch(batch)
 */
export async function syncVaultStudyBatch(
  batch: VaultStudySyncRequest, timeoutMs?: number,
): Promise<VaultStudySyncResponse> {
  const response = await apiFetch("/study/vault-sync", { method: "POST", body: JSON.stringify(batch), timeoutMs });
  return vaultStudySyncResponse.parse(response);
}
