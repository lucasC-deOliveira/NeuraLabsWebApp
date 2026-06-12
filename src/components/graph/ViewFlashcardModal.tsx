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
import { getNodeDetails } from "@/actions/graph";
import { MarkdownContent } from "@/components/markdown-content";

interface ViewFlashcardModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  flashcardId: string | null;
}

export function ViewFlashcardModal({ open, onOpenChange, flashcardId }: ViewFlashcardModalProps) {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<{ pergunta: string; resposta: string } | null>(null);

  useEffect(() => {
    if (!open || !flashcardId) return;
    let active = true;
    setLoading(true);
    setData(null);
    getNodeDetails("FLASHCARD", flashcardId)
      .then((d) => {
        if (!active) return;
        setData(d ? { pergunta: d.pergunta ?? "", resposta: d.resposta ?? "" } : null);
      })
      .catch(() => active && setData(null))
      .finally(() => active && setLoading(false));
    return () => {
      active = false;
    };
  }, [open, flashcardId]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg flex max-h-[85vh] flex-col gap-0">
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
            <div className="space-y-4">
              <div className="rounded-xl border bg-card p-4">
                <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                  Pergunta
                </span>
                <div className="mt-1 text-base font-medium">
                  <MarkdownContent>{data.pergunta}</MarkdownContent>
                </div>
              </div>
              <div className="rounded-xl border border-primary/30 bg-muted/40 p-4">
                <span className="text-[10px] font-semibold uppercase tracking-wider text-primary">
                  Resposta
                </span>
                <div className="mt-1 text-sm">
                  <MarkdownContent>{data.resposta}</MarkdownContent>
                </div>
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
