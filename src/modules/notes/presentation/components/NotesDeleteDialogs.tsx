"use client";

import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

interface NotesDeleteDialogsProps {
  hasDeleteTarget: boolean;
  onCancelDelete: () => void;
  onConfirmDelete: () => void;
  showDeleteAll: boolean;
  totalCount: number;
  onCancelDeleteAll: () => void;
  onConfirmDeleteAll: () => void;
}

export function NotesDeleteDialogs({
  hasDeleteTarget, onCancelDelete, onConfirmDelete,
  showDeleteAll, totalCount, onCancelDeleteAll, onConfirmDeleteAll,
}: NotesDeleteDialogsProps) {
  return (
    <>
      <Dialog open={hasDeleteTarget} onOpenChange={(open) => !open && onCancelDelete()}>
        <DialogContent className="max-w-sm mx-4">
          <DialogHeader>
            <DialogTitle>Confirmar exclusão</DialogTitle>
            <DialogDescription>
              Tem certeza que deseja remover esta nota? Os flashcards gerados a partir dela serão mantidos.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={onCancelDelete}>Cancelar</Button>
            <Button variant="destructive" onClick={onConfirmDelete}>Remover</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={showDeleteAll} onOpenChange={(open) => !open && onCancelDeleteAll()}>
        <DialogContent className="max-w-sm mx-4">
          <DialogHeader>
            <DialogTitle>Remover todas as notas</DialogTitle>
            <DialogDescription>
              Esta ação remove permanentemente todas as {totalCount} nota(s). Flashcards gerados serão mantidos.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={onCancelDeleteAll}>Cancelar</Button>
            <Button variant="destructive" onClick={onConfirmDeleteAll}>Remover todas</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
