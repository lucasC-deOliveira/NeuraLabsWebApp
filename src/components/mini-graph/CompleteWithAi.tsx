"use client";

import { useState } from "react";
import { toast } from "sonner";
import { SparklesIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { graphsContaining } from "@/lib/graph-api";
import { NodeInsightsModal } from "@/modules/graph/presentation/components/ai/NodeInsightsModal";

// Completa o item com IA reusando o MESMO fluxo do grafo (Insights da IA). A IA é
// escopada a um grafo, então achamos um grafo que contém o item (graphsContaining);
// se não estiver em nenhum, avisa. Ao adicionar, recarrega o mini-grafo.
export function CompleteWithAi({ type, id, label, onCompleted }: {
  type: string;
  id: string;
  label: string;
  onCompleted: () => void;
}) {
  const [grafoId, setGrafoId] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const start = (): void => {
    setBusy(true);
    graphsContaining(type, id)
      .then((gs) => {
        if (gs.length === 0) toast.info("Adicione o item a um grafo para completar com IA.");
        else setGrafoId(gs[0].grafoId);
      })
      .catch(() => toast.error("Não foi possível consultar os grafos do item."))
      .finally(() => setBusy(false));
  };

  return (
    <>
      <Button size="sm" className="gap-2" onClick={start} disabled={busy}>
        <SparklesIcon className="size-4" />
        Completar com IA
      </Button>
      <NodeInsightsModal
        open={!!grafoId}
        onOpenChange={(open) => !open && setGrafoId(null)}
        grafoId={grafoId ?? ""}
        nodeId={grafoId ? id : null}
        nodeLabel={label}
        onAdded={() => {
          setGrafoId(null);
          onCompleted();
        }}
      />
    </>
  );
}
