"use client";

import { useState } from "react";
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

// Tipos de entidade reutilizáveis que o usuário pode optar por manter.
const KEEPABLE: { type: string; label: string }[] = [
  { type: "FLASHCARD", label: "Flashcards" },
  { type: "NOTA", label: "Notas" },
  { type: "BARALHO", label: "Baralhos" },
  { type: "QUESTION", label: "Questões" },
  { type: "PROVA", label: "Provas" },
  { type: "TEXTO_BRUTO", label: "Textos brutos" },
];

interface DeleteGraphModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  graphName: string;
  loading?: boolean;
  /** keepTypes = tipos de entidade a PRESERVAR (os demais são apagados). */
  onConfirm: (keepTypes: string[]) => void;
}

export function DeleteGraphModal({ open, onOpenChange, graphName, loading, onConfirm }: DeleteGraphModalProps) {
  // default: manter tudo que é reutilizável (mais seguro)
  const [keep, setKeep] = useState<Set<string>>(() => new Set(KEEPABLE.map((k) => k.type)));

  const toggle = (type: string) =>
    setKeep((prev) => {
      const next = new Set(prev);
      if (next.has(type)) next.delete(type);
      else next.add(type);
      return next;
    });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Excluir grafo</DialogTitle>
          <DialogDescription>
            Excluir <span className="font-medium text-foreground">"{graphName}"</span> permanentemente.
            Os <span className="font-medium text-foreground">assuntos, tópicos e conceitos</span> deste grafo
            (incluindo o assunto-raiz) serão apagados.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-2">
          <p className="text-sm font-medium">Manter no sistema (não apagar a entidade):</p>
          <div className="grid grid-cols-2 gap-1.5">
            {KEEPABLE.map((k) => (
              <label
                key={k.type}
                className="flex items-center gap-2 rounded-md border border-border px-2.5 py-2 text-sm cursor-pointer hover:bg-muted/40"
              >
                <input
                  type="checkbox"
                  className="accent-[var(--primary)]"
                  checked={keep.has(k.type)}
                  onChange={() => toggle(k.type)}
                  disabled={loading}
                />
                {k.label}
              </label>
            ))}
          </div>
          <p className="text-xs text-muted-foreground">
            Itens desmarcados serão apagados. Entidades compartilhadas com outro grafo são sempre preservadas.
          </p>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={loading}>
            Cancelar
          </Button>
          <Button variant="destructive" className="gap-1.5" disabled={loading} onClick={() => onConfirm([...keep])}>
            {loading ? <Loader2Icon className="size-4 animate-spin" /> : <Trash2Icon className="size-4" />}
            Excluir grafo
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
