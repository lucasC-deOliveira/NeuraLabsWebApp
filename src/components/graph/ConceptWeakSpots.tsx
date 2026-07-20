import { useEffect, useState } from "react";
import { TargetIcon } from "lucide-react";
import { diagnoseConceptErrors, type ConceptErrorRank } from "@/lib/study-api";
import { VerNoGrafo } from "./VerNoGrafo";

// Painel do dashboard que faz o grafo virar coisa que se checa: os conceitos onde
// o usuário mais erra, cada um com um atalho direto para ele no grafo. Reusa o
// diagnóstico (0 token) e o "Ver no grafo" — fecha o laço home → estudo → grafo.
// Fica em components/ porque cruza dashboard e grafo e chama @/lib direto.
const TOP_N = 5;

export function ConceptWeakSpots() {
  const [conceitos, setConceitos] = useState<ConceptErrorRank[]>([]);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    let ignore = false;
    diagnoseConceptErrors()
      .then((res) => { if (!ignore) { setConceitos(res.conceitos.slice(0, TOP_N)); setLoaded(true); } })
      .catch(() => { if (!ignore) setLoaded(true); });
    return () => { ignore = true; };
  }, []);

  // Sem pontos fracos (ou sem histórico ainda): o painel não ocupa espaço à toa.
  if (!loaded || conceitos.length === 0) return null;

  return (
    <section className="rounded-lg border border-zinc-200 dark:border-zinc-800 p-3 sm:p-4">
      <header className="flex items-center gap-2 mb-3">
        <TargetIcon className="size-4 text-rose-500" />
        <h2 className="text-sm font-semibold">Onde você mais erra</h2>
        <span className="text-xs text-muted-foreground">— revise direto no grafo</span>
      </header>
      <ul className="space-y-1.5">
        {conceitos.map((c) => (
          <WeakSpotRow key={c.conceitoId} concept={c} />
        ))}
      </ul>
    </section>
  );
}

function WeakSpotRow({ concept }: { concept: ConceptErrorRank }) {
  const pct = Math.round(concept.taxaErro * 100);
  return (
    <li className="flex items-center gap-2 text-xs">
      <span className="font-medium flex-1 truncate">{concept.nome}</span>
      <span className="tabular-nums text-muted-foreground shrink-0">
        {concept.erros}/{concept.revisoes}
      </span>
      <span className={`tabular-nums font-medium shrink-0 w-9 text-right ${pct >= 60 ? "text-red-500" : "text-amber-500"}`}>
        {pct}%
      </span>
      <VerNoGrafo tipo="CONCEITO" refId={concept.conceitoId} />
    </li>
  );
}
