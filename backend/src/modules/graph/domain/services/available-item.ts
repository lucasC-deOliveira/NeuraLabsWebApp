// Read-model item for the "available to add" picker: a label/preview plus a
// human hierarchy string. The fields mirror what the graph UI consumes.
export interface AvailableItem {
  id: string;
  label: string;
  fullText: string;
  tipo: string;
  hierarquia: string;
  conceitoId?: string | null;
}

// A flashcard's concept with its optional topic/subject chain.
export interface FlashcardConcept {
  nome: string;
  topico: { nome: string; assunto: { nome: string } | null } | null;
}

// 50-char preview with an ellipsis appended when the text is longer.
export function preview(text: string): string {
  return text.length > 50 ? `${text.slice(0, 50)}...` : text;
}

// Human path "Assunto → Tópico → Conceito", degrading gracefully when the
// concept lacks a subject (no topic/subject) or is absent entirely.
export function flashcardHierarchy(conceito: FlashcardConcept | null): string {
  if (!conceito) return 'Sem conceito';
  const assunto = conceito.topico?.assunto;
  if (assunto) return `${assunto.nome} → ${conceito.topico!.nome} → ${conceito.nome}`;
  return `${conceito.nome} (sem tópico)`;
}
