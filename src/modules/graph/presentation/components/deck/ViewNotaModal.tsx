import { useEffect, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Loader2Icon } from "lucide-react";
import { toast } from "sonner";
import { graphHttp } from "@/modules/graph/infra/http";
import type { NodeDetails } from "@/modules/graph/application/ports/graph-nodes.port";
import { useSpeech, type SpeechControls } from "@/components/speech/useSpeech";
import { SpeakButton } from "@/components/speech/SpeakButton";
import { SpokenText } from "@/components/speech/SpokenText";
import { isDesktop, desktop } from "@/lib/vault-bridge";
import { graphVaultDir } from "@/lib/vault-sync";
import { parseNode } from "@/lib/vault-format";
import { VAULT_GUIDE_FILENAME } from "@/lib/vault-guide";

const TIPO_LABELS: Record<string, string> = {
  LITERATURA: "Nota de referência",
  PERMANENTE: "Nota permanente",
  ESTRUTURA: "Nota de estrutura",
};

const SUBTIPO_LABELS: Record<string, string> = {
  DEFINICAO: "Definição",
  EXPLICACAO: "Explicação",
  EXEMPLO: "Exemplo",
  COMPARACAO: "Comparação",
  SINTESE: "Síntese",
  PREREQUISITO: "Pré-requisito",
  ERRO_COMUM: "Erro comum",
  APLICACAO: "Aplicação",
};

interface ViewNotaModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  notaId: string | null;
  grafoId?: string;
  grafoNome?: string;
}

async function fetchNotaFromVault(
  notaId: string,
  grafoId: string,
  grafoNome: string,
): Promise<NodeDetails | null> {
  try {
    const vaultDir = await desktop.vault.getPath();
    if (!vaultDir) return null;
    const graphDir = graphVaultDir(vaultDir, grafoId, grafoNome);
    const files = await desktop.vault.read(graphDir);
    const mdFiles = files.filter(
      (f) => !f.relPath.replace(/\\/g, "/").endsWith(VAULT_GUIDE_FILENAME),
    );
    for (const f of mdFiles) {
      const parsed = parseNode(f.content);
      if (parsed?.id === notaId && parsed.tipo === "NOTA") {
        return {
          titulo: parsed.titulo ?? "",
          conteudo: parsed.conteudo ?? "",
          tipoNota: parsed.tipoNota ?? "PERMANENTE",
          subtipo: parsed.subtipo ?? null,
          fonte: parsed.fonte ?? null,
        };
      }
    }
  } catch {
    // vault indisponível
  }
  return null;
}

async function loadNota(notaId: string, grafoId?: string, grafoNome?: string): Promise<NodeDetails | null> {
  let details: NodeDetails | null = null;
  try { details = await graphHttp.getNodeDetails("NOTA", notaId); } catch { /* não está no backend */ }
  if (details) return details;
  if (isDesktop() && grafoId && grafoNome) {
    return fetchNotaFromVault(notaId, grafoId, grafoNome);
  }
  return null;
}

function NotaBody({ nota, speech }: { nota: NodeDetails; speech: SpeechControls }) {
  return (
    <div className="max-h-[60vh] overflow-y-auto pr-1">
      <SpokenText speech={speech} id="nota" text={nota.conteudo ?? ""} />
    </div>
  );
}

function NotaMeta({ nota }: { nota: NodeDetails }) {
  return (
    <DialogDescription className="space-y-1">
      <span className="flex flex-wrap items-center gap-2">
        <Badge variant="outline" className="text-xs">
          {TIPO_LABELS[nota.tipoNota ?? ""] ?? nota.tipoNota}
        </Badge>
        {nota.subtipo && (
          <Badge variant="secondary" className="text-xs">
            {SUBTIPO_LABELS[nota.subtipo] ?? nota.subtipo}
          </Badge>
        )}
        {nota.fonte && <span className="text-xs">Fonte: {nota.fonte}</span>}
      </span>
    </DialogDescription>
  );
}

export function ViewNotaModal({ open, onOpenChange, notaId, grafoId, grafoNome }: ViewNotaModalProps) {
  const [loading, setLoading] = useState(false);
  const [nota, setNota] = useState<NodeDetails | null>(null);
  const [prevKey, setPrevKey] = useState("");
  const speech = useSpeech();

  // Reset during render (react-hooks v7 forbids synchronous setState in the effect body).
  const loadKey = open && notaId ? notaId : "";
  if (loadKey !== prevKey) {
    setPrevKey(loadKey);
    if (loadKey) { setLoading(true); setNota(null); }
  }

  useEffect(() => {
    if (!open || !notaId) return;
    let ignore = false;
    loadNota(notaId, grafoId, grafoNome)
      .then((found): void => {
        if (ignore) return;
        if (found) { setNota(found); return; }
        toast.error("Nota não encontrada");
        onOpenChange(false);
      })
      .catch((): void => { if (!ignore) toast.error("Erro ao carregar a nota"); })
      .finally((): void => { if (!ignore) setLoading(false); });
    return (): void => { ignore = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, notaId]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <div className="flex items-start justify-between gap-2">
            <DialogTitle className="text-primary">
              {nota?.titulo ?? "Carregando..."}
            </DialogTitle>
            {nota && (
              <SpeakButton speech={speech} id="nota" text={nota.conteudo ?? ""} label="a nota" className="mr-6" />
            )}
          </div>
          {nota && <NotaMeta nota={nota} />}
        </DialogHeader>

        {loading ? (
          <div className="flex justify-center py-10">
            <Loader2Icon className="size-5 animate-spin" />
          </div>
        ) : (
          nota && <NotaBody nota={nota} speech={speech} />
        )}

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Fechar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
