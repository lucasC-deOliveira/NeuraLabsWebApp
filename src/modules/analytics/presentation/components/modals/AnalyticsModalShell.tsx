"use client";

import type { ReactNode } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

interface AnalyticsModalShellProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description?: string;
  children: ReactNode;
}

// Casca comum dos modais de analytics abertos a partir de um nó do grafo:
// diálogo rolável com cabeçalho, reutilizado por baralho/prova/flashcard/questão.
export function AnalyticsModalShell({ open, onOpenChange, title, description, children }: AnalyticsModalShellProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex h-[85dvh] max-h-[85dvh] w-[92vw] max-w-5xl sm:max-w-5xl flex-col gap-0 overflow-hidden">
        <DialogHeader className="shrink-0">
          <DialogTitle className="truncate">{title}</DialogTitle>
          {description && <DialogDescription className="truncate">{description}</DialogDescription>}
        </DialogHeader>
        <div className="min-h-0 flex-1 overflow-y-auto py-4">{children}</div>
      </DialogContent>
    </Dialog>
  );
}
