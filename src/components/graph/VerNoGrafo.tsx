import { useEffect, useState } from "react";
import { useRouter } from "@/lib/navigation";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { NetworkIcon, ChevronDownIcon } from "lucide-react";
import { graphsContaining, type EntityGraphRef } from "@/lib/graph-api";

interface VerNoGrafoProps {
  // Tipo do nó no grafo (FLASHCARD, NOTA, PROVA, QUESTION...) e o id da entidade.
  // refId pode ser undefined enquanto a página carrega — o botão só espera.
  tipo: string;
  refId: string | undefined;
  size?: "sm" | "default";
}

// "Ver no grafo" reutilizável: abre o grafo já centrado nesta entidade (?focus).
// Fica em components/ (fora do gate estrito) porque cruza várias features e é a
// única forma de nota/prova/etc. linkarem para o grafo sem importar @/lib direto.
export function VerNoGrafo({ tipo, refId, size = "sm" }: VerNoGrafoProps) {
  const router = useRouter();
  const [graphs, setGraphs] = useState<EntityGraphRef[]>([]);

  useEffect(() => {
    if (!refId) return;
    let ignore = false;
    graphsContaining(tipo, refId)
      .then((gs) => { if (!ignore) setGraphs(gs); })
      .catch(() => {});
    return () => { ignore = true; };
  }, [tipo, refId]);

  // Sem id ainda, ou fora de qualquer grafo: sem destino, o botão não aparece.
  if (!refId || graphs.length === 0) return null;

  const go = (grafoId: string): void => {
    router.push(`/graph/${grafoId}?focus=${encodeURIComponent(refId)}`);
  };

  if (graphs.length === 1) {
    return (
      <Button variant="outline" size={size} className="gap-2" onClick={() => go(graphs[0].grafoId)}>
        <NetworkIcon className="size-4" />
        Ver no grafo
      </Button>
    );
  }

  // Em vários grafos: deixa o usuário escolher qual vista abrir.
  return (
    <DropdownMenu>
      <DropdownMenuTrigger render={
        <Button variant="outline" size={size} className="gap-2">
          <NetworkIcon className="size-4" />
          Ver no grafo
          <ChevronDownIcon className="size-3.5" />
        </Button>
      } />
      <DropdownMenuContent align="end">
        {graphs.map((g) => (
          <DropdownMenuItem key={g.grafoId} onClick={() => go(g.grafoId)}>
            {g.nome}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
