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
import { useComposition } from "./useComposition";
import type { CompositionGraph, CompositionTipo } from "./composition.types";

interface MiniGraphModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  tipo: CompositionTipo;
  id: string | null;
}

// Modal com o mini-grafo composto do item (força-dirigido, estilo Obsidian), usando
// o mesmo vocabulário/cores do grafo. Auto-carrega via GET /graph/composition.
export function MiniGraphModal({ open, onOpenChange, title, tipo, id }: MiniGraphModalProps) {
  const { graph, loading, error } = useComposition(tipo, open ? id : null);
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex max-h-[85dvh] w-[92vw] max-w-4xl flex-col gap-0 overflow-hidden sm:max-w-4xl">
        <DialogHeader className="shrink-0">
          <DialogTitle className="truncate">{title}</DialogTitle>
          <DialogDescription>Conexões com conceitos, tópicos e assuntos</DialogDescription>
        </DialogHeader>
        <div className="min-h-0 flex-1 overflow-auto py-4">
          <MiniGraphBody loading={loading} error={error} graph={graph} />
        </div>
      </DialogContent>
    </Dialog>
  );
}

function MiniGraphBody({ loading, error, graph }: {
  loading: boolean;
  error: string | null;
  graph: CompositionGraph | null;
}) {
  if (loading) return <LoadingState message="Montando o mini-grafo…" hint="Reunindo a composição do item." />;
  if (error) return <ErrorState message={error} />;
  if (!graph || graph.nodes.length <= 1) return <EmptyHint />;
  return <MiniGraph graph={graph} />;
}

function EmptyHint() {
  return (
    <div className="flex flex-col items-center justify-center gap-3 py-12 text-sm text-muted-foreground">
      <NetworkIcon className="size-6" />
      <p className="max-w-xs text-center">
        Este item ainda não está ligado a conceitos — conecte-o a um conceito para ver o mini-grafo.
      </p>
    </div>
  );
}
