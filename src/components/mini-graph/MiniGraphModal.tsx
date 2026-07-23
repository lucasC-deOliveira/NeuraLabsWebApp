"use client";

import { NetworkIcon } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { LoadingState, ErrorState } from "@/components/loading-state";
import { MiniGraph } from "./MiniGraph";
import { buildMiniGraph } from "./build-mini-graph";
import type { ConceptConnection } from "./mini-graph.types";

interface MiniGraphModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  rootLabel: string;
  connections: ConceptConnection[] | null;
  loading?: boolean;
  error?: string | null;
}

// Modal com o mini-grafo do item e suas conexões de conceito/tópico/assunto.
// Reutilizado pelas listagens de flashcards, baralhos, provas e questões.
export function MiniGraphModal({ open, onOpenChange, title, rootLabel, connections, loading, error }: MiniGraphModalProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex max-h-[85dvh] w-[92vw] max-w-4xl flex-col gap-0 overflow-hidden sm:max-w-4xl">
        <DialogHeader className="shrink-0">
          <DialogTitle className="truncate">{title}</DialogTitle>
          <DialogDescription>Conexões com conceitos, tópicos e assuntos</DialogDescription>
        </DialogHeader>
        <div className="min-h-0 flex-1 overflow-auto py-4">
          <MiniGraphBody loading={loading} error={error} rootLabel={rootLabel} connections={connections} />
        </div>
      </DialogContent>
    </Dialog>
  );
}

function MiniGraphBody({ loading, error, rootLabel, connections }: {
  loading?: boolean;
  error?: string | null;
  rootLabel: string;
  connections: ConceptConnection[] | null;
}) {
  if (loading) return <LoadingState message="Montando o mini-grafo…" hint="Reunindo os conceitos conectados." />;
  if (error) return <ErrorState message={error} />;
  if (!connections || connections.length === 0) return <EmptyHint />;
  return <MiniGraph model={buildMiniGraph(rootLabel, connections)} />;
}

function EmptyHint() {
  return (
    <div className="flex flex-col items-center justify-center gap-3 py-12 text-sm text-muted-foreground">
      <NetworkIcon className="size-6" />
      <p className="max-w-xs text-center">
        Este item ainda não está conectado a conceitos no grafo — conecte-o para ver o mini-grafo.
      </p>
    </div>
  );
}
