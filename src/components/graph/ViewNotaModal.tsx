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
import { getNodeDetails } from "@/actions/graph";
import { MarkdownContent } from "@/components/markdown-content";

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
}

export function ViewNotaModal({ open, onOpenChange, notaId }: ViewNotaModalProps) {
  const [loading, setLoading] = useState(false);
  const [nota, setNota] = useState<Record<string, string | null> | null>(null);

  useEffect(() => {
    if (!open || !notaId) return;
    setLoading(true);
    setNota(null);
    getNodeDetails("NOTA", notaId)
      .then((details) => {
        if (details) {
          setNota(details);
        } else {
          toast.error("Nota não encontrada");
          onOpenChange(false);
        }
      })
      .catch(() => toast.error("Erro ao carregar a nota"))
      .finally(() => setLoading(false));
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
              <MarkdownContent>{nota.textoBruto ?? ""}</MarkdownContent>
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
