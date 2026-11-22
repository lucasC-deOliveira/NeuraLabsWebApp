import { desktop } from "@/lib/vault-bridge";
import { transcriptPageSections } from "../domain/transcription-page";

/** Falls back to the paginated Markdown when an image-only PDF has no searchable text. */
export async function readAssistantPage(book: string, page: number, readPdfText: () => Promise<string>): Promise<string> {
  const text = await readPdfText().catch(() => "");
  if (text.trim()) return text;
  const transcripts = await desktop.vault.listReaderTranscriptions(book);
  const full = transcripts.find(({ wholeBook }) => wholeBook);
  if (!full) return "";
  const markdown = await desktop.vault.readReaderTranscription(book, full.id);
  return transcriptPageSections(markdown).get(page)?.split("\n").slice(1)
    .filter((line) => !line.startsWith("![")).join("\n") ?? "";
}
