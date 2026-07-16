import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Loader2Icon, Trash2Icon, InfoIcon } from "lucide-react";

interface DeleteGraphModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  graphName: string;
  loading?: boolean;
  onConfirm: () => void;
}

// O grafo é uma VISTA sobre nós que pertencem ao sistema. Apagá-lo apaga a vista,
// não o conteúdo — por isso este modal deixou de perguntar "o que manter?" (havia
// uma lista de caixas de seleção) e passou a explicar o que acontece. Um card
// classificado não pode sumir porque você apagou uma vista dele.
export function DeleteGraphModal({ open, onOpenChange, graphName, loading, onConfirm }: DeleteGraphModalProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Excluir grafo</DialogTitle>
          <DialogDescription>
            Excluir <span className="font-medium text-foreground">"{graphName}"</span> — a organização
            visual deste grafo, o layout dos nós e o vínculo deles com ele.
          </DialogDescription>
        </DialogHeader>

        <div className="flex items-start gap-2 rounded-md bg-muted/60 px-3 py-2.5 text-xs text-muted-foreground">
          <InfoIcon className="size-4 shrink-0 mt-px" />
          <span>
            <span className="font-medium text-foreground">Nada do conteúdo é apagado.</span> Flashcards,
            notas, baralhos, questões e conceitos continuam no sistema e nos outros grafos onde aparecem.
            Para apagar um item de vez, exclua o nó dele.
          </span>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={loading}>
            Cancelar
          </Button>
          {/* `onClick={onConfirm}` passaria o evento do clique como argumento. */}
          <Button variant="destructive" className="gap-1.5" disabled={loading} onClick={() => onConfirm()}>
            {loading ? <Loader2Icon className="size-4 animate-spin" /> : <Trash2Icon className="size-4" />}
            Excluir grafo
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
