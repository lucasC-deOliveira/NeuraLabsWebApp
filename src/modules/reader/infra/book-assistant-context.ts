import type { ReaderExplanationReference } from "@contracts/reader-explanation";
import { desktop } from "@/lib/vault-bridge";
import { decodeVaultGraphManifest, existingVaultGraphDirectory, VAULT_GRAPH_MANIFEST } from "@/lib/vault-graph-manifest";
import { bookGraphId } from "./consolidate-book-graph";

/** Looks up a bounded set of cross-page passages in the book's own transcript. */
export async function findBookAssistantEvidence(book: string, query: string): Promise<ReaderExplanationReference[]> {
  const available = await desktop.vault.listReaderTranscriptions(book);
  const selected = available.find(({ wholeBook }) => wholeBook);
  if (!selected) return [];
  const hits = await desktop.vault.findReaderBookEvidence(book, selected.id, query);
  return hits.flatMap(({ section, label, chapter, text }) => {
    const page = /^Página ([1-9]\d*)$/u.exec(label ?? "")?.[1];
    return page ? [{ section, page: Number(page), transcription: selected.id, chapter, quote: text }] : [];
  });
}

/** Reads only graph metadata to identify the pages that have been analyzed. */
export async function bookAssistantCoverage(book: string): Promise<number[]> {
  const id = await bookGraphId(book);
  const directory = await existingVaultGraphDirectory(id);
  if (!directory) return [];
  const manifest = await desktop.vault.readFile(directory, VAULT_GRAPH_MANIFEST);
  return decodeVaultGraphManifest(manifest, id)?.bookIndex?.coverage ?? [];
}
