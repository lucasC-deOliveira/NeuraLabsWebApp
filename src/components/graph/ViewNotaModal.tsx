"use client";

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
import { getNodeDetails } from "@/lib/graph-api";
import { MarkdownContent } from "@/components/markdown-content";
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
): Promise<Record<string, string | null> | null> {
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

export function ViewNotaModal({ open, onOpenChange, notaId, grafoId, grafoNome }: ViewNotaModalProps) {
  const [loading, setLoading] = useState(false);
  const [nota, setNota] = useState<Record<string, string | null> | null>(null);

  useEffect(() => {
    if (!open || !notaId) return;
    setLoading(true);
    setNota(null);
    async function load() {
      let details = null;
      try { details = await getNodeDetails("NOTA", notaId!); } catch { /* não está no backend */ }
      if (details) { setNota(details); return; }
      if (isDesktop() && grafoId && grafoNome) {
        const fromVault = await fetchNotaFromVault(notaId!, grafoId, grafoNome);
        if (fromVault) { setNota(fromVault); return; }
      }
      toast.error("Nota não encontrada");
      onOpenChange(false);
    }
    load().catch(() => toast.error("Erro ao carregar a nota")).finally(() => setLoading(false));
  }, [open, notaId]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="text-primary">
            {nota?.titulo ?? "Carregando..."}
          </DialogTitle>
          {nota && (
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
          )}
        </DialogHeader>

        {loading ? (
          <div className="flex justify-center py-10">
            <Loader2Icon className="size-5 animate-spin" />
          </div>
        ) : (
          nota && (
            <div className="max-h-[60vh] overflow-y-auto pr-1">
              <MarkdownContent>{nota.conteudo ?? ""}</MarkdownContent>
            </div>
          )
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
