"use client";

import { useState } from "react";
import { toast } from "sonner";
import { SparklesIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { listUserGraphs } from "@/lib/graph-api";
import { expandNode, classifyFlashcard, populateGraphFromBaralho } from "@/lib/ai-api";
import { expandActionFor, type ExpandKind } from "@/modules/graph/presentation/services/node-expand-action";

// O grafo de conhecimento é o raiz (master) do usuário — contém tudo.
async function rootGrafoId(): Promise<string | null> {
  const res = await listUserGraphs({ tipo: "raiz", pageSize: 1 });
  return res.items[0]?.id ?? null;
}

// Mesma dispatch do grafo: baralho popula, flashcard classifica, estrutural expande.
async function runExpand(kind: ExpandKind, grafoId: string, id: string): Promise<void> {
  if (kind === "populate") await populateGraphFromBaralho(grafoId, id);
  else if (kind === "classify") await classifyFlashcard(grafoId, id);
  else await expandNode(grafoId, id);
}

// Expande o item no grafo de conhecimento (reusa a MESMA IA do grafo). Só aparece
// para tipos que têm expansão (flashcard/baralho; prova/questão não têm). Ao
// terminar, recarrega o mini-grafo para mostrar o que a IA ligou.
export function CompleteWithAi({ type, id, onCompleted }: {
  type: string;
  id: string;
  onCompleted: () => void;
}) {
  const action = expandActionFor(type);
  const [busy, setBusy] = useState(false);
  if (!action) return null;

  const run = (): void => {
    setBusy(true);
    const tid = toast.loading("Expandindo com IA…");
    rootGrafoId()
      .then((grafoId) =>
        grafoId
          ? runExpand(action.kind, grafoId, id)
          : Promise.reject(new Error("Grafo de conhecimento não encontrado.")),
      )
      .then(() => {
        toast.success("Grafo expandido pela IA.", { id: tid });
        onCompleted();
      })
      .catch((e) => toast.error(e instanceof Error ? e.message : "Erro ao expandir com IA.", { id: tid }))
      .finally(() => setBusy(false));
  };

  return (
    <Button size="sm" className="gap-2" onClick={run} disabled={busy}>
      <SparklesIcon className="size-4" />
      {action.label}
    </Button>
  );
}
