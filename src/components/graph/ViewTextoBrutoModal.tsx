"use client";

import { useEffect, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Loader2Icon } from "lucide-react";
import { getNodeDetails } from "@/lib/graph-api";
import { isDesktop } from "@/lib/vault-bridge";
import { findVaultNode } from "@/lib/vault-sync";

interface ViewTextoBrutoModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  textoId: string | null;
  grafoId?: string;
  grafoNome?: string;
}

export function ViewTextoBrutoModal({ open, onOpenChange, textoId, grafoId, grafoNome }: ViewTextoBrutoModalProps) {
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<{ titulo: string; texto: string } | null>(null);

  useEffect(() => {
    if (!open || !textoId) return;
    setLoading(true);
    setData(null);
    async function load() {
      if (isDesktop() && grafoId && grafoNome) {
        const vn = await findVaultNode(grafoId, grafoNome, textoId!, "TEXTO_BRUTO");
        if (vn) { setData({ titulo: vn.titulo ?? vn.nome ?? "Texto bruto", texto: vn.texto ?? "" }); return; }
      }
      let details = null;
      try { details = await getNodeDetails("TEXTO_BRUTO", textoId!); } catch {}
      if (details) { setData({ titulo: details.titulo ?? details.nome ?? "Texto bruto", texto: details.texto ?? "" }); return; }
      setData(null);
    }
    load().catch(() => setData(null)).finally(() => setLoading(false));
  }, [open, textoId]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl flex max-h-[85dvh] flex-col overflow-hidden gap-0">
        <DialogHeader className="shrink-0">
          <DialogTitle className="truncate">{data?.titulo ?? "Texto bruto"}</DialogTitle>
        </DialogHeader>

        <div className="min-h-0 flex-1 overflow-y-auto py-4">
          {loading ? (
            <div className="flex justify-center py-10">
              <Loader2Icon className="size-5 animate-spin" />
            </div>
          ) : !data?.texto ? (
            <p className="py-10 text-center text-sm text-muted-foreground">
              Nenhum conteúdo disponível.
            </p>
          ) : (
            <pre className="whitespace-pre-wrap text-sm leading-relaxed font-sans">{data.texto}</pre>
          )}
        </div>

        <DialogFooter className="shrink-0">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Fechar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
