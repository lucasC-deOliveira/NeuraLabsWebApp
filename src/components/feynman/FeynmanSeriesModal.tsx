"use client";

import { useState } from "react";
import { ChevronLeftIcon, ChevronRightIcon, InboxIcon } from "lucide-react";
import { useCachedResource } from "@/modules/cache/presentation/useCachedResource";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { LoadingState, ErrorState } from "@/components/loading-state";
import { getItemComposition } from "@/lib/graph-api";
import { FeynmanPanel } from "./FeynmanPanel";

interface Concept {
  id: string;
  label: string;
}

// Extrai os conceitos (nós CONCEITO) do baralho via composição do grafo.
async function loadConcepts(baralhoId: string): Promise<Concept[]> {
  const g = await getItemComposition("baralho", baralhoId);
  return g.nodes.filter((n) => n.type === "CONCEITO").map((n) => ({ id: n.id, label: n.label }));
}

// Modo Feynman em série: varre os conceitos de um baralho (via composição do grafo)
// e explica um a um, reusando o FeynmanPanel com navegação.
export function FeynmanSeriesModal({ open, onOpenChange, baralhoId, title }: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  baralhoId: string | null;
  title: string;
}) {
  const [idx, setIdx] = useState(0);
  const [prevId, setPrevId] = useState<string | null>(null);
  if (baralhoId !== prevId) { setPrevId(baralhoId); setIdx(0); } // reseta a navegação ao trocar de baralho

  // Conceitos do baralho, cacheados por id (SWR): reabrir o mesmo baralho é instantâneo.
  const { data: concepts, loading, error } = useCachedResource<Concept[]>(
    open && baralhoId ? { key: `feynman.concepts.${baralhoId}`, version: 1, tags: ["feynman"] } : null,
    () => loadConcepts(baralhoId as string),
    "Erro ao carregar os conceitos.",
  );

  const total = concepts?.length ?? 0;
  const current = total > 0 ? (concepts as Concept[])[Math.min(idx, total - 1)] : null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex max-h-[85dvh] w-[92vw] max-w-2xl flex-col gap-0 overflow-hidden sm:max-w-2xl">
        <DialogHeader className="shrink-0">
          <DialogTitle className="truncate">Modo Feynman — {title}</DialogTitle>
          <DialogDescription className="truncate">
            {current ? `Conceito ${idx + 1} de ${total}: ${current.label}` : "Explique cada conceito do baralho"}
          </DialogDescription>
        </DialogHeader>

        {loading ? (
          <LoadingState message="Carregando os conceitos do baralho…" />
        ) : error ? (
          <ErrorState message={error} />
        ) : !current ? (
          <EmptyHint />
        ) : (
          <FeynmanPanel
            alvoTipo="CONCEITO"
            alvoId={current.id}
            footerLeft={<Nav idx={idx} total={total} onIdx={setIdx} />}
          />
        )}
      </DialogContent>
    </Dialog>
  );
}

function Nav({ idx, total, onIdx }: { idx: number; total: number; onIdx: (i: number) => void }) {
  return (
    <>
      <Button variant="ghost" size="sm" className="gap-1" disabled={idx === 0} onClick={() => onIdx(idx - 1)}>
        <ChevronLeftIcon className="size-4" />
        Anterior
      </Button>
      <Button variant="ghost" size="sm" className="gap-1" disabled={idx >= total - 1} onClick={() => onIdx(idx + 1)}>
        Próximo
        <ChevronRightIcon className="size-4" />
      </Button>
    </>
  );
}

function EmptyHint() {
  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-3 py-12 text-sm text-muted-foreground">
      <InboxIcon className="size-6" />
      <p className="max-w-xs text-center">Este baralho ainda não tem conceitos conectados no grafo.</p>
    </div>
  );
}
