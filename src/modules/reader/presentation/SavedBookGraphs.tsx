import { useEffect, useState, type ReactElement } from "react";
import { Link } from "@/components/link";
import { desktop } from "@/lib/vault-bridge";
import { consolidateBookGraph } from "../infra/consolidate-book-graph";

/** Lists graph contexts saved for the open library book. */
export function SavedBookGraphs({ book, revision }: { book: string; revision: number }): ReactElement | null {
  const [graph, setGraph] = useState<{ id: string } | null>(null);
  const [failed, setFailed] = useState(false);
  useEffect(() => {
    let active = true;
    void consolidateBookGraph(desktop.vault, book).then(
      (saved) => {
        if (!active) return;
        setFailed(false);
        setGraph(saved);
      },
      () => { if (active) setFailed(true); },
    );
    return (): void => { active = false; };
  }, [book, revision]);
  if (failed) return <p role="alert" className="text-sm">Não foi possível carregar o grafo deste livro.</p>;
  if (!graph) return null;
  return (
    <div className="space-y-1 border-t pt-2 text-sm">
      <Link className="inline-block rounded-md border px-2 py-1 hover:bg-muted"
        href={`/graph/${encodeURIComponent(graph.id)}`}>Abrir grafo do livro</Link>
    </div>
  );
}
