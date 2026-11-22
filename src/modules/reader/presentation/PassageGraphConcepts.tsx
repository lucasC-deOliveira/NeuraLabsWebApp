import { useState, type ReactElement } from "react";
import { Link } from "@/components/link";
import { getReaderGraph, type ReaderGraphConcept } from "@/lib/reader-graph-context";
import { findPassageConcepts } from "../domain/passage-concepts";

/** Shows named concepts from the last open graph for a selected excerpt. */
export function PassageGraphConcepts({ passage }: { passage: string }): ReactElement | null {
  const graph = getReaderGraph();
  const [concepts, setConcepts] = useState<ReaderGraphConcept[] | null>(null);
  if (!graph) return null;
  return (
    <details className="px-2 pb-2 text-sm" onToggle={(event) => {
      if (event.currentTarget.open) setConcepts(findPassageConcepts(passage, graph.concepts));
    }}>
      <summary className="cursor-pointer text-primary">Conceitos em {graph.name}</summary>
      {concepts?.length === 0 && <p className="mt-1 text-muted-foreground">Nenhum conceito do grafo foi citado neste trecho.</p>}
      {!!concepts?.length && (
        <ul className="mt-1 flex flex-wrap gap-2">
          {concepts.map((concept) => (
            <li key={concept.id}>
              <Link className="inline-block rounded-md border px-2 py-1 hover:bg-muted"
                href={`/graph/${encodeURIComponent(graph.id)}?focus=${encodeURIComponent(concept.id)}&from=reader`}>
                {concept.label}
              </Link>
            </li>
          ))}
        </ul>
      )}
    </details>
  );
}
