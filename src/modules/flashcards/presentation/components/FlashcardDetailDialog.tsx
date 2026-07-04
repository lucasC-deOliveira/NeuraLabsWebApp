"use client";

import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { PencilIcon } from "lucide-react";
import type { FlashcardItem, SpacedRepetition } from "../../domain/flashcard.types";
import { formatDistanceToNow } from "../../domain/services/srs-status";
import { ESTAGIO_LABELS, ESTAGIO_STYLES } from "../constants/estagio";

function SrsGrid({ sr, stage }: { sr: SpacedRepetition; stage: number }) {
  const dueInfo = formatDistanceToNow(new Date(sr.proximaRevisao));
  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 p-3 bg-zinc-50 dark:bg-zinc-900/50 rounded-md border border-zinc-200 dark:border-zinc-800">
      <div className="text-center">
        <p className="text-lg font-semibold">{sr.dificuldade}</p>
        <p className="text-[10px] text-zinc-400">Dificuldade</p>
      </div>
      <div className="text-center">
        <p className="text-lg font-semibold">{sr.intervalo}d</p>
        <p className="text-[10px] text-zinc-400">Intervalo</p>
      </div>
      <div className="text-center">
        <p className="text-lg font-semibold">{ESTAGIO_LABELS[stage] || "-"}</p>
        <p className="text-[10px] text-zinc-400">Estagio</p>
      </div>
      <div className="text-center">
        <p className={`text-lg font-semibold ${dueInfo.severe ? "text-red-500" : ""}`}>{dueInfo.text}</p>
        <p className="text-[10px] text-zinc-400">Proxima revisao</p>
      </div>
    </div>
  );
}

interface FlashcardDetailDialogProps {
  card: FlashcardItem | null;
  onClose: () => void;
  onEdit: () => void;
}

export function FlashcardDetailDialog({ card, onClose, onEdit }: FlashcardDetailDialogProps) {
  const sr = card?.spacedRepetition ?? null;
  const stage = sr?.estagioAprendizado;
  const stageStyle = stage && stage > 0 ? ESTAGIO_STYLES[stage] : null;

  return (
    <Dialog open={!!card} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-xl">
        {card && (
          <>
            <DialogHeader>
              <DialogTitle>Flashcard</DialogTitle>
              <DialogDescription>Detalhes do flashcard</DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label className="text-[10px] text-zinc-400 uppercase tracking-wider">Pergunta</Label>
                <p className="text-sm font-medium mt-1">{card.pergunta}</p>
              </div>
              <div>
                <Label className="text-[10px] text-zinc-400 uppercase tracking-wider">Resposta</Label>
                <p className="text-sm text-muted-foreground mt-1 whitespace-pre-line leading-relaxed">{card.resposta}</p>
              </div>
              <Separator />
              <div className="flex flex-wrap gap-1.5">
                <Badge variant="secondary" className="text-xs">{card.conceito}</Badge>
                <Badge variant="outline" className="text-xs">{card.topico}</Badge>
                <Badge variant="outline" className="text-xs">{card.assunto}</Badge>
                {stage !== undefined && stage > 0 && stageStyle && (
                  <div className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ring-1 ring-inset ${stageStyle}`}>
                    {ESTAGIO_LABELS[stage]}
                  </div>
                )}
              </div>
              {sr ? (
                <SrsGrid sr={sr} stage={stage as number} />
              ) : (
                <div className="text-center p-3 bg-zinc-50 dark:bg-zinc-900/50 rounded-md border border-zinc-200 dark:border-zinc-800">
                  <p className="text-xs text-zinc-400">Sem dados de repeticao espacada</p>
                </div>
              )}
              <div className="flex items-center justify-between text-xs text-zinc-400">
                <span>Criado em {card.dataCriacao.toLocaleDateString("pt-BR", { day: "2-digit", month: "short", year: "numeric" })}</span>
                <span>ID: {card.id.slice(-6)}</span>
              </div>
            </div>
            <DialogFooter className="gap-1">
              <Button variant="outline" size="sm" onClick={onClose}>Fechar</Button>
              <Button variant="outline" size="sm" onClick={onEdit}>
                <PencilIcon className="size-3.5 mr-1" />Editar
              </Button>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
