// Derives the list view's title/preview/word-count from a note's raw Markdown
// content. Pure logic.
export interface NotePreview {
  titulo: string;
  preview: string;
  wordCount: number;
}

export function derivePreview(conteudo: string): NotePreview {
  const text = conteudo || '';
  const titulo =
    text
      .split('\n')[0]
      .replace(/^#+\s*/, '')
      .slice(0, 80) || 'Sem titulo';
  const preview = text
    .replace(/^#+\s.*\n?/, '')
    .slice(0, 200)
    .trim();
  const wordCount = text.trim().split(/\s+/).filter(Boolean).length;
  return { titulo, preview, wordCount };
}
