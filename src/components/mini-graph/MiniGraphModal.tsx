"use client";

import { useState } from "react";
import { NetworkIcon } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { LoadingState, ErrorState } from "@/components/loading-state";
import { VerNoGrafo } from "@/components/graph/VerNoGrafo";
import { MiniGraph } from "./MiniGraph";
import { CompleteWithAi } from "./CompleteWithAi";
import { useComposition } from "./useComposition";
import {
  TIPO_TO_TYPE,
  TYPE_TO_TIPO,
  type CompositionGraph,
  type CompositionNode,
  type CompositionNodeType,
  type CompositionTipo,
} from "./composition.types";

interface MiniGraphModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  tipo: CompositionTipo;
  id: string | null;
}

interface Target {
  tipo: CompositionTipo;
  type: CompositionNodeType;
  id: string;
  label: string;
}

// Modal com o mini-grafo composto do item (força-dirigido, estilo Obsidian), no
// mesmo vocabulário/cores do grafo. Clicar num nó componível re-centra a teia nele;
// "Ver no grafo" abre o grafo grande focado no item (?focus).
export function MiniGraphModal({ open, onOpenChange, title, tipo, id }: MiniGraphModalProps) {
  const [target, setTarget] = useState<Target | null>(null);
  const [prevKey, setPrevKey] = useState<string | null>(null);
  const propKey = id ? `${tipo}:${id}` : null;
  if (propKey !== prevKey) {
    setPrevKey(propKey);
    setTarget(id ? { tipo, type: TIPO_TO_TYPE[tipo], id, label: title } : null);
  }

  const active = open ? target : null;
  const { graph, loading, error, reload } = useComposition(active?.tipo ?? tipo, active?.id ?? null);

  const recenter = (node: CompositionNode): void => {
    const nextTipo = TYPE_TO_TIPO[node.type];
    if (nextTipo) setTarget({ tipo: nextTipo, type: node.type, id: node.id, label: node.label });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex max-h-[85dvh] w-[92vw] max-w-4xl flex-col gap-0 overflow-hidden sm:max-w-4xl">
        <DialogHeader className="shrink-0">
          <DialogTitle className="truncate">{target?.label ?? title}</DialogTitle>
          <DialogDescription>Conexões com conceitos, tópicos e assuntos · clique num nó para focar</DialogDescription>
        </DialogHeader>
        <div className="min-h-0 flex-1 overflow-auto py-4">
          <MiniGraphBody
            loading={loading}
            error={error}
            graph={graph}
            onNodeClick={recenter}
            complete={active ? <CompleteWithAi type={active.type} id={active.id} label={active.label} onCompleted={reload} /> : null}
          />
        </div>
        {active && graph && graph.nodes.length > 1 && (
          <div className="flex shrink-0 items-center justify-end border-t pt-3">
            <VerNoGrafo tipo={active.type} refId={active.id} />
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

function MiniGraphBody({ loading, error, graph, onNodeClick, complete }: {
  loading: boolean;
  error: string | null;
  graph: CompositionGraph | null;
  onNodeClick: (node: CompositionNode) => void;
  complete: React.ReactNode;
}) {
  if (loading) return <LoadingState message="Montando o mini-grafo…" hint="Reunindo a composição do item." />;
  if (error) return <ErrorState message={error} />;
  if (!graph || graph.nodes.length <= 1) return <EmptyHint complete={complete} />;
  return <MiniGraph graph={graph} onNodeClick={onNodeClick} />;
}

function EmptyHint({ complete }: { complete: React.ReactNode }) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 py-12 text-sm text-muted-foreground">
      <NetworkIcon className="size-6" />
      <p className="max-w-xs text-center">
        Este item ainda não está ligado a conceitos. Complete com a IA ou conecte-o a um conceito no grafo.
      </p>
      {complete}
    </div>
  );
}
