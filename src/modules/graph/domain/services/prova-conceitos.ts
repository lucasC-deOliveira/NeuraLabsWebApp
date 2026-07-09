// Pure state helpers for the exam-review concept picker: turns the backend's
// per-question suggestions into toggleable entries, and back into the confirmed
// list sent on create. Self-contained types (no port import) to keep domain pure.

export interface ConceitoSuggestion {
  nome: string;
  conceitoId: string | null;
}

export interface ConceitoPickerEntry {
  nome: string;
  conceitoId: string | null;
  selected: boolean;
}

export interface QuestaoConceitosSuggestion {
  numero: number;
  conceitos: ConceitoSuggestion[];
}

/** Suggestions → picker entries keyed by question number, all pre-selected. */
export function initialConceitoEntries(
  suggestions: QuestaoConceitosSuggestion[],
): Record<number, ConceitoPickerEntry[]> {
  const byNumero: Record<number, ConceitoPickerEntry[]> = {};
  for (const s of suggestions) {
    byNumero[s.numero] = s.conceitos.map((c) => ({ ...c, selected: true }));
  }
  return byNumero;
}

/** Flips whether a suggested concept is selected. */
export function toggleConceito(
  entries: ConceitoPickerEntry[],
  nome: string,
): ConceitoPickerEntry[] {
  return entries.map((e) => (e.nome === nome ? { ...e, selected: !e.selected } : e));
}

/** Appends a user-typed new concept (conceitoId null); ignores blanks/duplicates. */
export function addConceito(entries: ConceitoPickerEntry[], nome: string): ConceitoPickerEntry[] {
  const trimmed = nome.trim();
  if (trimmed === "" || entries.some((e) => e.nome.toLowerCase() === trimmed.toLowerCase())) {
    return entries;
  }
  return [...entries, { nome: trimmed, conceitoId: null, selected: true }];
}

/** The confirmed concepts to send on create (selected only, without the flag). */
export function confirmedConceitos(entries: ConceitoPickerEntry[]): ConceitoSuggestion[] {
  return entries.filter((e) => e.selected).map(({ nome, conceitoId }) => ({ nome, conceitoId }));
}
