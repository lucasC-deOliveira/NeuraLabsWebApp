export type ReaderExplanationMode = "explain" | "simplify" | "analogy" | "summary";

export interface ReaderExplanationReference {
  section: number;
  page: number;
  transcription: string;
  chapter?: string;
  quote: string;
}

export interface ReaderExplanation {
  id: string;
  mode: ReaderExplanationMode;
  question: string;
  answer: string;
  scope?: "book";
  references?: ReaderExplanationReference[];
}

export interface SavedReaderExplanation {
  id: string;
  markdown: string;
  source: { transcription: string; section: number } | null;
  references?: ReaderExplanationReference[];
  scope?: "book";
}
