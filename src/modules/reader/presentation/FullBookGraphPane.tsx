import { lazy, Suspense, useCallback, useEffect, useState, type ReactElement } from "react";
import { desktop } from "@/lib/vault-bridge";
import { Button } from "@/components/ui/button";
import type { VaultNode } from "@/lib/vault-format";
import { bookGraphId } from "../infra/consolidate-book-graph";
import { bookCitationLinks } from "../infra/book-graph-provenance";
import type { TranscriptionEvidence } from "./TranscriptionEvidenceHighlight";

const GraphEditor = lazy(() => import("@/app/graph/[id]/page"));
type GraphEditorLoad = "loading" | "missing" | "failed" | { graphId: string };

async function findBookGraphEditor(book: string): Promise<GraphEditorLoad> {
  const graphId = await bookGraphId(book);
  const folders = await desktop.vault.listGraphFolders();
  return folders.some(({ id, bookSource }) => id === graphId && bookSource?.consolidated) ? { graphId } : "missing";
}

/** Opens the regular graph editor inside the synchronized reader. */
export function FullBookGraphPane({ book, page, onEvidence }: {
  book: string; page: number; onEvidence: (evidence: TranscriptionEvidence | null) => void;
}): ReactElement {
  const [loaded, setLoaded] = useState<GraphEditorLoad>("loading");
  const [showAll, setShowAll] = useState(false);
  useEffect(() => {
    let active = true;
    void findBookGraphEditor(book).then(
      (result) => { if (active) setLoaded(result); },
      () => { if (active) setLoaded("failed"); },
    );
    return (): void => { active = false; };
  }, [book]);
  const onCitationNode = useCallback((node: VaultNode | null, pinned: boolean): void => {
    const quotes = node ? [...new Set(bookCitationLinks(node).filter((citation) => citation.book === book).map(({ quote }) => quote))] : [];
    onEvidence(quotes.length ? { quotes, pinned } : null);
  }, [book, onEvidence]);
  if (loaded === "loading") return <p role="status">Abrindo editor do grafo…</p>;
  if (loaded === "missing") return <p>Este livro ainda não tem um grafo de análise.</p>;
  if (loaded === "failed") return <p role="alert">Não foi possível abrir o editor do grafo.</p>;
  return (
    <div className="flex h-[65vh] min-h-[30rem] min-w-[42rem] flex-col gap-2">
      <div className="flex gap-2">
        <Button size="sm" variant={showAll ? "outline" : "default"} onClick={() => setShowAll(false)}>Página atual</Button>
        <Button size="sm" variant={showAll ? "default" : "outline"} onClick={() => setShowAll(true)}>Todo o grafo</Button>
      </div>
      <div className="min-h-0 flex-1">
        <Suspense fallback={<p role="status">Abrindo editor do grafo…</p>}>
          <GraphEditor embedded={{ graphId: loaded.graphId, page, showAll, onCitationNode }} />
        </Suspense>
      </div>
    </div>
  );
}
