import { useEffect, type RefObject } from "react";
import { findTranscriptionHighlights } from "./transcription-highlight";
import "./transcription-evidence-highlight.css";

export interface TranscriptionEvidence {
  quotes: readonly string[];
  pinned: boolean;
}

const highlightName = "neuralabs-book-evidence";

function revealCitation(content: HTMLElement, range: Range): void {
  const pane = content.closest<HTMLElement>("[data-book-pane-scroll]");
  if (!pane) return;
  const visible = pane.getBoundingClientRect();
  const quote = range.getBoundingClientRect();
  if (quote.top >= visible.top && quote.bottom <= visible.bottom) return;
  pane.scrollTop += quote.top - visible.top - (pane.clientHeight - quote.height) / 2;
}

/** Highlights source citations and brings a pinned citation into the transcription viewport. */
export function TranscriptionEvidenceHighlight({ content, evidence, page }: {
  content: RefObject<HTMLDivElement | null>; evidence: TranscriptionEvidence | null; page: number;
}): null {
  useEffect(() => {
    const element = content.current;
    if (!element || !evidence?.quotes.length || !CSS.highlights) return;
    const ranges = findTranscriptionHighlights(element, evidence.quotes);
    if (!ranges.length) return;
    CSS.highlights.set(highlightName, new Highlight(...ranges));
    if (evidence.pinned) revealCitation(element, ranges[0]);
    return (): void => { CSS.highlights.delete(highlightName); };
  }, [content, evidence, page]);
  return null;
}
