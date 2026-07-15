"use client";

import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

interface ConfirmDeleteBaralhoDialogProps {
  titulo: string | null;
  onCancel: () => void;
  onConfirm: () => void;
}

export function ConfirmDeleteBaralhoDialog({ titulo, onCancel, onConfirm }: ConfirmDeleteBaralhoDialogProps) {
  return (
    <Dialog open={titulo !== null} onOpenChange={(open: boolean) => !open && onCancel()}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>Confirmar exclusao</DialogTitle>
          <DialogDescription>
            Remover o baralho &quot;{titulo}&quot;? Ele sai também dos grafos em que aparece.
            Os flashcards continuam existindo na sua lista — só deixam de estar agrupados aqui.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button variant="outline" onClick={onCancel}>Cancelar</Button>
          <Button variant="destructive" onClick={onConfirm}>Remover</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
