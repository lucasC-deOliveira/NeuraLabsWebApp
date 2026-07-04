// Presentation-facing date formatting for notes (pt-BR).

/** e.g. "09 jan. 2026" — used in note cards and the detail header. */
export function formatFullDate(date: Date): string {
  return new Date(date).toLocaleDateString("pt-BR", { day: "2-digit", month: "short", year: "numeric" });
}

/** Humanizes a SubtipoNota code for display, e.g. "ERRO_COMUM" → "erro comum". */
export function formatSubtipoLabel(subtipo: string): string {
  return subtipo.replace("_", " ").toLowerCase();
}
