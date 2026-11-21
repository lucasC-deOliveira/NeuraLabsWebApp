import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  syncVaultExamAttempts, type VaultExamSyncSummary,
} from "../../../application/sync-vault-exam-attempts";
import { makeVaultExamAttemptSync, VaultExamBridgeUnavailableError } from "../../../infra/vault/vault-exam-attempt-sync";
import { downloadVaultExamHistory } from "../../../application/download-vault-exam-history";
import { makeVaultExamHistory } from "../../../infra/vault/vault-exam-history";

export function VaultExamAttemptSync({ directory, graphId, disabled }: {
  directory: string; graphId: string; disabled: boolean;
}) {
  const [message, setMessage] = useState("");
  const [running, setRunning] = useState(false);
  const [failed, setFailed] = useState(false);
  const [summary, setSummary] = useState<VaultExamSyncSummary | null>(null);

  async function sendAttempts(): Promise<void> {
    setSummary(null);
    setFailed(false);
    setRunning(true);
    setMessage("Lendo tentativas concluídas no vault…");
    try {
      const result = await syncVaultExamAttempts(makeVaultExamAttemptSync(directory, graphId),
        (current, total) => setMessage(`Enviando tentativa ${current} de ${total}…`));
      setSummary(result);
      setMessage("");
    } catch (error) {
      setFailed(true);
      setMessage(error instanceof VaultExamBridgeUnavailableError
        ? "Feche e reabra o NeuraLabs para carregar a atualização do Electron e enviar as tentativas."
        : "Não foi possível ler as tentativas neste vault.");
    } finally {
      setRunning(false);
    }
  }

  async function downloadAttempts(): Promise<void> {
    setSummary(null);
    setFailed(false);
    setRunning(true);
    setMessage("Buscando tentativas concluídas no servidor…");
    try {
      const result = await downloadVaultExamHistory(makeVaultExamHistory(directory, graphId),
        ({ downloaded }) => setMessage(`Gravando no vault. ${downloaded} tentativa(s) baixada(s)…`));
      setMessage(`${result.downloaded} baixada(s), ${result.existing} já no vault.`);
    } catch {
      setFailed(true);
      setMessage("Não foi possível concluir o download. Confira a sessão, a conexão e a pasta do vault. As tentativas já baixadas foram preservadas.");
    } finally {
      setRunning(false);
    }
  }

  return (
    <div className="space-y-1">
      <div className="flex flex-wrap gap-2">
        <Button type="button" variant="outline" size="sm" disabled={disabled || running} onClick={sendAttempts}>
          Enviar tentativas de prova
        </Button>
        <Button type="button" variant="outline" size="sm" disabled={disabled || running} onClick={downloadAttempts}>
          Baixar tentativas de prova
        </Button>
      </div>
      {message && <p role={failed ? "alert" : "status"} className="text-sm">{message}</p>}
      {summary && <VaultExamDeliverySummary summary={summary} />}
    </div>
  );
}

function VaultExamDeliverySummary({ summary }: { summary: VaultExamSyncSummary }) {
  const { sent, alreadyRecorded, pending, issues } = summary;
  if (sent + alreadyRecorded + pending === 0) {
    return <p role="status" className="text-sm">
      Nenhuma tentativa concluída neste grafo. Para enviar, reabra a prova, responda às questões restantes
      e clique em Ver resultado.
    </p>;
  }
  return (
    <div role="status" className="text-sm">
      <p>{sent} enviada(s), {alreadyRecorded} já no servidor, {pending} pendente(s) no vault.</p>
      {issues.length > 0 && <ul className="list-disc pl-4">
        {[...new Set(issues.map(({ message }) => message))].map((message) => <li key={message}>{message}</li>)}
      </ul>}
    </div>
  );
}
