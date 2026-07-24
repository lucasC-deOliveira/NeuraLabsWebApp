"use client";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { FeynmanPanel } from "./FeynmanPanel";
import type { FeynmanAlvoTipo } from "./feynman.types";

interface FeynmanModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  alvoTipo: FeynmanAlvoTipo;
  alvoId: string | null;
  title: string;
}

// Técnica Feynman (alvo único): você explica com palavras simples e a IA aponta
// clareza, jargão, lacunas (→ conceitos) e sugere analogia/reescrita. Refina e repete.
export function FeynmanModal({ open, onOpenChange, alvoTipo, alvoId, title }: FeynmanModalProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex max-h-[85dvh] w-[92vw] max-w-2xl flex-col gap-0 overflow-hidden sm:max-w-2xl">
        <DialogHeader className="shrink-0">
          <DialogTitle className="truncate">Explique com suas palavras</DialogTitle>
          <DialogDescription className="truncate">{title}</DialogDescription>
        </DialogHeader>
        <FeynmanPanel alvoTipo={alvoTipo} alvoId={alvoId} />
      </DialogContent>
    </Dialog>
  );
}
