import { memo, useEffect, useRef, useState, type ReactElement } from "react";
import { desktop } from "@/lib/vault-bridge";
import { MarkdownContent } from "@/components/markdown-content";
import { transcriptPageSections } from "../domain/transcription-page";
import { LocalTranscriptionFigure } from "./BookTranscriptions";
import { TranscriptionEvidenceHighlight, type TranscriptionEvidence } from "./TranscriptionEvidenceHighlight";

type TranscriptionPages = "loading" | "missing" | "failed" | { id: string; sections: Map<number, string> };

async function readTranscriptionPages(book: string): Promise<TranscriptionPages> {
  const items = await desktop.vault.listReaderTranscriptions(book);
  const current = items.find(({ wholeBook }) => wholeBook);
  if (!current) return "missing";
  const markdown = await desktop.vault.readReaderTranscription(book, current.id);
  const sections = transcriptPageSections(markdown);
  return sections.size ? { id: current.id, sections } : "missing";
}

/** Shows the matching transcription page, retaining its local figures. */
export function SyncedBookTranscription({ book, page, evidence }: {
  book: string; page: number; evidence: TranscriptionEvidence | null;
}): ReactElement {
  const content = useRef<HTMLDivElement>(null);
  const [state, setState] = useState<TranscriptionPages>("loading");
  useEffect(() => {
    let active = true;
    void readTranscriptionPages(book).then(
      (result) => { if (active) setState(result); },
      () => { if (active) setState("failed"); },
    );
    return (): void => { active = false; };
  }, [book]);
  if (state === "loading") return <p role="status">Abrindo transcrição…</p>;
  if (state === "failed") return <p role="alert">Não foi possível ler a transcrição.</p>;
  if (state === "missing") return <p>Gere uma transcrição separada por páginas para acompanhá-la aqui.</p>;
  const markdown = state.sections.get(page);
  if (markdown === undefined) return <p>Não há transcrição para a página {page}.</p>;
  return (
    <div ref={content}>
      <TranscribedPage book={book} id={state.id} markdown={markdown} />
      <TranscriptionEvidenceHighlight content={content} evidence={evidence} page={page} />
    </div>
  );
}

const TranscribedPage = memo(function TranscribedPage({ book, id, markdown }: { book: string; id: string; markdown: string }): ReactElement {
  return (
    <MarkdownContent image={({ src, alt }) => <LocalTranscriptionFigure book={book} id={id}
      source={typeof src === "string" ? src : ""} alt={alt ?? ""} />}>
      {markdown}
    </MarkdownContent>
  );
});
