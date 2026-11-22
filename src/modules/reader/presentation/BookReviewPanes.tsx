import { useCallback, useEffect, useRef, useState, type ReactElement, type ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { SyncedBookTranscription } from "./SyncedBookTranscription";
import { SyncedBookGraph } from "./SyncedBookGraph";
import type { TranscriptionEvidence } from "./TranscriptionEvidenceHighlight";
import { FullBookGraphPane } from "./FullBookGraphPane";

/** Displays the PDF, its transcript and its graph at the same physical page. */
export function BookReviewPanes({ book, page, pdf }: { book: string; page: number; pdf: ReactNode }): ReactElement {
  const [highlight, setHighlight] = useState<{ page: number; evidence: TranscriptionEvidence | null }>({ page, evidence: null });
  const [fullGraph, setFullGraph] = useState(false);
  if (highlight.page !== page) setHighlight({ page, evidence: null });
  const onEvidence = useCallback((evidence: TranscriptionEvidence | null): void => {
    setHighlight({ page, evidence });
  }, [page]);
  return (
    <div className={`grid min-w-0 items-start gap-3 ${fullGraph
      ? "lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_minmax(0,2fr)]" : "lg:grid-cols-3"}`}>
      <BookPagePane title="PDF original" page={page}>{pdf}</BookPagePane>
      <BookPagePane title="Transcrição" page={page}><SyncedBookTranscription book={book} page={page}
        evidence={highlight.page === page ? highlight.evidence : null} /></BookPagePane>
      <BookPagePane title="Grafo" page={page} action={<Button size="sm" variant="outline" aria-pressed={fullGraph}
        onClick={() => { setFullGraph(!fullGraph); onEvidence(null); }}>
        {fullGraph ? "Voltar à prévia" : "Grafo completo"}
      </Button>}>
        {fullGraph ? <FullBookGraphPane book={book} page={page} onEvidence={onEvidence} />
          : <SyncedBookGraph book={book} page={page} onEvidence={onEvidence} />}
      </BookPagePane>
    </div>
  );
}

function BookPagePane({ title, page, action, children }: { title: string; page: number; action?: ReactNode; children: ReactNode }): ReactElement {
  const content = useRef<HTMLDivElement>(null);
  useEffect(() => { if (content.current) content.current.scrollTop = 0; }, [page]);
  return (
    <section className="min-w-0 overflow-hidden rounded-lg border bg-card">
      <div className="flex items-center justify-between border-b px-3 py-2 text-sm">
        <h3 className="font-medium">{title}</h3>
        <span className="text-muted-foreground">Página {page}</span>
        {action}
      </div>
      <div ref={content} data-book-pane-scroll className="max-h-[70vh] min-h-44 overflow-auto px-3 py-2 text-sm">{children}</div>
    </section>
  );
}
