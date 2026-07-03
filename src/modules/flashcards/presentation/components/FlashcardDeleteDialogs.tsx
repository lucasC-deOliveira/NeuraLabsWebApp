"use client";

import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Loader2Icon } from "lucide-react";
import { truncate } from "../constants/estagio";

interface FlashcardDeleteDialogsProps {
  deleteTargetPergunta: string | null;
  submitting: boolean;
  onCancelDelete: () => void;
  onConfirmDelete: () => void;
  showDeleteAll: boolean;
  totalCount: number;
  onCancelDeleteAll: () => void;
  onConfirmDeleteAll: () => void;
}

export function FlashcardDeleteDialogs({
  deleteTargetPergunta, submitting, onCancelDelete, onConfirmDelete,
  showDeleteAll, totalCount, onCancelDeleteAll, onConfirmDeleteAll,
}: FlashcardDeleteDialogsProps) {
  return (
    <>
      <Dialog open={deleteTargetPergunta !== null} onOpenChange={(open) => !open && onCancelDelete()}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Confirmar exclusao</DialogTitle>
            <DialogDescription>
              Tem certeza que deseja remover o flashcard &quot;{deleteTargetPergunta ? truncate(deleteTargetPergunta, 80) : ""}&quot;? Essa acao nao pode ser desfeita.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={onCancelDelete} disabled={submitting}>Cancelar</Button>
            <Button variant="destructive" onClick={onConfirmDelete} disabled={submitting}>
              {submitting && <Loader2Icon className="size-4 mr-1 animate-spin" />}
              Remover
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={showDeleteAll} onOpenChange={(open) => !open && onCancelDeleteAll()}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Remover todos os flashcards</DialogTitle>
            <DialogDescription>
              Esta ação remove permanentemente todos os {totalCount} flashcard(s). Essa ação não pode ser desfeita.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={onCancelDeleteAll} disabled={submitting}>Cancelar</Button>
            <Button variant="destructive" onClick={onConfirmDeleteAll} disabled={submitting}>
              {submitting && <Loader2Icon className="size-4 mr-1 animate-spin" />}
              Remover todos
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
