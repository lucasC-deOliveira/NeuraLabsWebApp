import { useState } from "react";
import { DownloadIcon } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { VaultDeckDownloadError, type VaultDeckDownloadFailure } from "../../application/vault-deck-download-error";

const DOWNLOAD_FAILURE_MESSAGES: Record<VaultDeckDownloadFailure, string> = {
  "vault-not-configured": "Escolha uma pasta em Configurações → Desktop → Vault.",
  "session-required": "Entre novamente na sua conta para baixar o baralho.",
  "server-unavailable": "Não foi possível buscar o baralho no servidor. Tente novamente.",
  "deck-unavailable": "O baralho não está disponível para esta conta no servidor.",
  "schedule-unavailable": "O servidor não enviou um agendamento compatível. Atualize o backend e tente novamente.",
  "vault-write-failed": "Não foi possível salvar o baralho. Confira se a pasta do vault está acessível e permite gravação.",
};

export function DownloadOfflineDeckButton({ downloadDeck, vault = false }: {
  downloadDeck: () => Promise<void>;
  vault?: boolean;
}) {
  const [downloading, setDownloading] = useState(false);

  async function download(): Promise<void> {
    setDownloading(true);
    try {
      await downloadDeck();
      toast.success(vault ? "Baralho disponível no vault." : "Baralho salvo na biblioteca offline.");
    } catch (error) {
      toast.error(error instanceof VaultDeckDownloadError
        ? DOWNLOAD_FAILURE_MESSAGES[error.reason]
        : "Não foi possível baixar o baralho. Tente novamente.");
    } finally {
      setDownloading(false);
    }
  }

  return (
    <Button variant="outline" className="h-9" disabled={downloading} onClick={download}>
      <DownloadIcon className="size-4 mr-1" />
      {downloading ? "Baixando…" : vault ? "Disponibilizar no vault" : "Baixar para uso offline"}
    </Button>
  );
}
