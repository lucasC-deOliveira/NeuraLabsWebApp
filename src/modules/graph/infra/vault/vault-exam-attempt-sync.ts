import { z } from "zod";
import { vaultProvaAttemptContract } from "@contracts/provas";
import { ApiError, getToken, resolveApiUrl } from "@/lib/api";
import { uploadVaultProvaAttempt } from "@/lib/provas-api";
import { desktop } from "@/lib/vault-bridge";
import type { VaultExamAttemptSyncPort, VaultExamDelivery } from "../../application/sync-vault-exam-attempts";

const examAttemptFile = vaultProvaAttemptContract.omit({ localAttemptId: true }).extend({
  version: z.literal(1),
  id: z.string().uuid(),
  graphId: z.string(),
  provaId: z.string().min(1),
});

export class VaultExamBridgeUnavailableError extends Error {
  constructor() {
    super("Missing listExamAttempts IPC bridge. Expected an updated Electron preload.");
  }
}

export async function listVaultExamAttempts(directory: string): Promise<string[]> {
  const pending = desktop.vault.listExamAttempts(directory);
  if (pending === null) throw new VaultExamBridgeUnavailableError();
  return pending;
}

function decodeExamAttempt(raw: string | null): z.infer<typeof examAttemptFile> | null {
  try {
    return examAttemptFile.parse(JSON.parse(raw ?? ""));
  } catch {
    return null;
  }
}

function examDeliveryFailure(error: unknown): VaultExamDelivery {
  if (error instanceof ApiError && error.status === 403) {
    return { status: "failed", message: "A prova pertence a outra conta." };
  }
  if (error instanceof ApiError && error.status === 404) {
    return { status: "failed", message: "A prova não está disponível no servidor ou o servidor precisa ser atualizado." };
  }
  if (error instanceof ApiError && [400, 409].includes(error.status)) {
    return { status: "failed", message: error.message };
  }
  return { status: "paused", message: "Envio interrompido. Confira a sessão e a conexão com o servidor." };
}

async function deliverExamAttempt(attempt: z.infer<typeof examAttemptFile>): Promise<VaultExamDelivery> {
  try {
    const { id, provaId, ...attemptBody } = attempt;
    const result = await uploadVaultProvaAttempt(provaId, { ...attemptBody, localAttemptId: id });
    return { status: result.alreadyRecorded ? "alreadyRecorded" : "sent" };
  } catch (error) {
    return examDeliveryFailure(error);
  }
}

/** Connects completed exam files to the server selected when the user starts the transfer.
 * @example const transfer = makeVaultExamAttemptSync(graphDirectory, graphId)
 */
export function makeVaultExamAttemptSync(directory: string, graphId: string): VaultExamAttemptSyncPort {
  const token = getToken();
  const server = resolveApiUrl();
  return {
    list: async () => (await listVaultExamAttempts(directory)).filter((file) => !file.startsWith(".neuralabs-exam-attempts/server-")),
    async send(file): Promise<VaultExamDelivery> {
      const attempt = decodeExamAttempt(await desktop.vault.readFile(directory, file));
      if (!attempt || attempt.graphId !== graphId || !file.endsWith(`/${attempt.id}.json`)) {
        return { status: "failed", message: "O arquivo da tentativa é inválido para este grafo." };
      }
      if (!token || token !== getToken() || server !== resolveApiUrl()) {
        return { status: "paused", message: "Entre no servidor e tente enviar as tentativas novamente." };
      }
      return deliverExamAttempt(attempt);
    },
  };
}
