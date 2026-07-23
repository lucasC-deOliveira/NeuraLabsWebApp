"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { listUserGraphs, composeItemIntoGraph } from "@/lib/graph-api";
import type { CompositionTipo } from "./composition.types";

interface GraphOption {
  id: string;
  nome: string;
}

// Compõe o item num grafo escolhido (traz item + conceitos/tópicos/assuntos,
// mesclado). Some quando o usuário ainda não tem grafos.
export function AddToGraphControl({ tipo, id }: { tipo: CompositionTipo; id: string }) {
  const [graphs, setGraphs] = useState<GraphOption[]>([]);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let active = true;
    listUserGraphs({ pageSize: 100 })
      .then((r) => { if (active) setGraphs(r.items.map((g) => ({ id: g.id, nome: g.nome }))); })
      .catch(() => undefined);
    return (): void => { active = false; };
  }, []);

  const addTo = (grafoId: string | null): void => {
    if (!grafoId) return;
    setBusy(true);
    composeItemIntoGraph(grafoId, tipo, id)
      .then((r) => toast.success(`Composto no grafo — ${r.nodes} nós, ${r.edges} novas conexões.`))
      .catch(() => toast.error("Não foi possível compor no grafo."))
      .finally(() => setBusy(false));
  };

  if (graphs.length === 0) return null;
  return (
    <div className="flex items-center gap-2">
      <span className="text-xs text-muted-foreground">Adicionar a um grafo:</span>
      <Select onValueChange={addTo} disabled={busy}>
        <SelectTrigger className="h-8 w-56 text-xs">
          <SelectValue placeholder="Escolher grafo…" />
        </SelectTrigger>
        <SelectContent>
          {graphs.map((g) => (
            <SelectItem key={g.id} value={g.id}>
              {g.nome}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
