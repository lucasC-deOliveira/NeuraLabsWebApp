"use client";

import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2Icon, LayersIcon } from "lucide-react";

interface GenerateDeckModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  defaultTitle: string;
  flashcardCount: number;
  loading?: boolean;
  onConfirm: (titulo: string) => void;
}

export function GenerateDeckModal({
  open,
  onOpenChange,
  defaultTitle,
  flashcardCount,
  loading,
  onConfirm,
}: GenerateDeckModalProps) {
  const [titulo, setTitulo] = useState(defaultTitle);

  useEffect(() => {
    if (open) setTitulo(defaultTitle);
  }, [open, defaultTitle]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>Gerar baralho</DialogTitle>
          <DialogDescription>
            {flashcardCount > 0
              ? `Cria um novo baralho com ${flashcardCount} flashcard${flashcardCount !== 1 ? "s" : ""} conectados a este nó.`
              : "Nenhum flashcard conectado a este nó encontrado."}
          </DialogDescription>
        </DialogHeader>

        {flashcardCount > 0 && (
          <div className="space-y-2">
            <Label htmlFor="deck-title" className="text-sm">
              Nome do baralho
            </Label>
            <Input
              id="deck-title"
              value={titulo}
              onChange={(e) => setTitulo(e.target.value)}
              placeholder="Nome do baralho"
              disabled={loading}
              onKeyDown={(e) => {
                if (e.key === "Enter" && titulo.trim()) onConfirm(titulo.trim());
              }}
            />
          </div>
        )}

        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={loading}>
            Cancelar
          </Button>
          {flashcardCount > 0 && (
            <Button
              onClick={() => onConfirm(titulo.trim() || defaultTitle)}
              disabled={loading || !titulo.trim()}
            >
              {loading ? (
                <Loader2Icon className="size-4 animate-spin" />
              ) : (
                <LayersIcon className="size-4" />
              )}
              Gerar baralho
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
