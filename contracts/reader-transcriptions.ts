export interface ReaderTranscription {
  id: string;
  first: number | null;
  last: number | null;
  modifiedAt: number;
  wholeBook: boolean;
}

export interface ReaderSemanticHit {
  section: number;
  label: string | null;
  text: string;
  chapter?: string;
}
