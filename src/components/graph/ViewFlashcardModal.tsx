"use client";

import { useEffect, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Loader2Icon } from "lucide-react";
import { getNodeDetails } from "@/lib/graph-api";
import { FlashcardFace } from "@/components/flashcard/FlashcardFace";
import { isDesktop } from "@/lib/vault-bridge";
import { findVaultNode } from "@/lib/vault-sync";

interface ViewFlashcardModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  flashcardId: string | null;
  grafoId?: string;
  grafoNome?: string;
}

export function ViewFlashcardModal({ open, onOpenChange, flashcardId, grafoId, grafoNome }: ViewFlashcardModalProps) {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<{ pergunta: string; resposta: string } | null>(null);

  useEffect(() => {
    if (!open || !flashcardId) return;
    let active = true;
    setLoading(true);
    setData(null);
    getNodeDetails("FLASHCARD", flashcardId)
      .then(async (d) => {
        if (!active) return;
        if (d) {
          setData({ pergunta: d.pergunta ?? "", resposta: d.resposta ?? "" });
          return;
        }
        // Fallback: busca no vault
        if (isDesktop() && grafoId && grafoNome) {
          const vn = await findVaultNode(grafoId, grafoNome, flashcardId, "FLASHCARD");
          if (active && vn) {
            setData({ pergunta: vn.pergunta ?? "", resposta: vn.resposta ?? "" });
            return;
          }
        }
        if (active) setData(null);
      })
      .catch(() => active && setData(null))
      .finally(() => active && setLoading(false));
    return () => { active = false; };
  }, [open, flashcardId]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg flex max-h-[85dvh] flex-col overflow-hidden gap-0">
        <DialogHeader className="shrink-0">
          <DialogTitle>Conteúdo do flashcard</DialogTitle>
          <DialogDescription>Apenas exibição — não conta como revisão.</DialogDescription>
        </DialogHeader>

        <div className="min-h-0 flex-1 overflow-y-auto py-4">
          {loading ? (
            <div className="flex items-center justify-center gap-2 py-10 text-sm text-muted-foreground">
              <Loader2Icon className="size-4 animate-spin" />
              Carregando...
            </div>
          ) : !data ? (
            <p className="py-10 text-center text-sm text-muted-foreground">
              Não foi possível carregar este flashcard.
            </p>
          ) : (
            <FlashcardFace pergunta={data.pergunta} resposta={data.resposta} showAnswer />
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
