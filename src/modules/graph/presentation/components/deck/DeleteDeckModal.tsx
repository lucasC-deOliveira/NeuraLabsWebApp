import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Loader2Icon, Trash2Icon } from "lucide-react";

interface DeleteDeckModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  deckLabel: string;
  loading?: boolean;
  onConfirm: (deleteConnected: boolean) => void;
}

export function DeleteDeckModal({ open, onOpenChange, deckLabel, loading, onConfirm }: DeleteDeckModalProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>Excluir baralho</DialogTitle>
          <DialogDescription>
            Excluir <span className="font-medium text-foreground">"{deckLabel}"</span> permanentemente.
            O que fazer com os nós conectados a ele?
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-2">
          <Button
            variant="outline"
            className="w-full justify-start"
            disabled={loading}
            onClick={() => onConfirm(false)}
          >
            {loading ? <Loader2Icon className="size-4 animate-spin" /> : <Trash2Icon className="size-4" />}
            Excluir só o baralho
          </Button>
          <Button
            variant="destructive"
            className="w-full justify-start"
            disabled={loading}
            onClick={() => onConfirm(true)}
          >
            {loading ? <Loader2Icon className="size-4 animate-spin" /> : <Trash2Icon className="size-4" />}
            Excluir baralho e nós conectados
          </Button>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={loading}>
            Cancelar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
