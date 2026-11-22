import type { BookGraphIndex, BookGraphSource } from "@contracts/book-graph-source";
import type { VaultBookGraphWrite, VaultFile, VaultGraphFolder } from "@/lib/vault-bridge";
import { decodeVaultGraphManifest, sharedGraphMetadataDir, VAULT_GRAPH_MANIFEST, type VaultGraphManifest } from "@/lib/vault-graph-manifest";
import { parseNode, type VaultNode } from "@/lib/vault-format";
import { isPaginatedBook } from "../domain/book-page-selection";
import { mergeBookGraph, type BookGraphBatch } from "./book-graph-merge";
import { inferBookGraphSource, indexImportedBookGraph } from "./book-graph-provenance";

export interface BookGraphFiles {
  getPath(): Promise<string | null>;
  listGraphFolders(): Promise<VaultGraphFolder[]>;
  read(directory: string): Promise<VaultFile[]>;
  readFile(directory: string, name: string): Promise<string | null>;
  readReaderTranscription(book: string, transcription: string): Promise<string>;
  writeBookGraph(update: VaultBookGraphWrite): Promise<boolean>;
}

const emptyIndex: BookGraphIndex = { coverage: [], imported: [], nodes: {}, edges: {} };
type AcceptedBookBatch = { transcription: string; batch: BookGraphBatch };
const sourceNodes = (files: VaultFile[]): VaultNode[] => files.flatMap(({ content }) => {
  const node = parseNode(content);
  return node ? [node] : [];
});

/** Derives the stable graph identity from the book's relative library path.
 * @example await bookGraphId("Book.pdf")
 */
export async function bookGraphId(book: string): Promise<string> {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(book));
  return `book-${Array.from(new Uint8Array(digest).slice(0, 20), (byte) => byte.toString(16).padStart(2, "0")).join("")}`;
}

/** Returns the physical pages in a modern transcription, or an empty legacy range.
 * @example await bookGraphPages(files, "Book.pdf", "book/Livro.md")
 */
export async function bookGraphPages(files: Pick<BookGraphFiles, "readReaderTranscription">, book: string, transcription: string): Promise<string[]> {
  const content = await files.readReaderTranscription(book, transcription).catch(() => "");
  const pages = content.split(/^<!-- neuralabs-reader-batch -->\r?\n/mu).slice(1);
  return isPaginatedBook(pages) ? pages : [];
}

async function importedBatch(files: BookGraphFiles, folder: VaultGraphFolder, book: string): Promise<{ source: BookGraphSource; batch: BookGraphBatch } | null> {
  const nodes = sourceNodes(await files.read(folder.directory));
  const source = folder.bookSource ?? inferBookGraphSource(nodes);
  if (source?.book !== book) return null;
  const pages = await bookGraphPages(files, book, source.transcription);
  return { source, batch: { nodes, imported: folder.id, index: indexImportedBookGraph(nodes, source, pages) } };
}

function matchesOldBook(folder: VaultGraphFolder, book: string, title: string): boolean {
  if (folder.bookSource) return !folder.bookSource.consolidated && folder.bookSource.book === book;
  return folder.label === `Análise · ${title}`;
}

async function readConsolidation(files: BookGraphFiles, book: string, id: string, vault: string): Promise<{
  directory: string; raw: string | null; current: VaultGraphManifest | null; originals: VaultFile[];
  imports: { source: BookGraphSource; batch: BookGraphBatch }[]; title: string;
}> {
  const title = book.split("/").at(-1)?.replace(/\.pdf$/iu, "") ?? book;
  const directory = sharedGraphMetadataDir(vault, id);
  const folders = await files.listGraphFolders();
  const exists = folders.some((folder) => folder.id === id);
  const raw = exists ? await files.readFile(directory, VAULT_GRAPH_MANIFEST) : null;
  const current = decodeVaultGraphManifest(raw, id);
  if (exists && (!current?.bookSource?.consolidated || current.bookSource.book !== book)) throw new Error("Invalid existing book graph manifest.");
  const candidates = folders.filter((folder) => matchesOldBook(folder, book, title) && !current?.bookIndex?.imported.includes(folder.id));
  const imports = (await Promise.all(candidates.map((folder) => importedBatch(files, folder, book))))
    .filter((entry) => entry !== null);
  return { directory, raw, current, originals: exists ? await files.read(directory) : [], imports, title };
}

type ConsolidationSnapshot = Awaited<ReturnType<typeof readConsolidation>>;

function consolidatedBookManifest(
  id: string, book: string, snapshot: ConsolidationSnapshot, index: BookGraphIndex, accepted?: AcceptedBookBatch,
): VaultGraphManifest {
  const transcription = accepted?.transcription ?? snapshot.current?.bookSource?.transcription ?? snapshot.imports[0].source.transcription;
  return {
    ...snapshot.current, version: 1, id, layout: "shared-para", name: snapshot.current?.name ?? snapshot.title,
    publication: snapshot.current?.publication ?? "pending", bookSource: { book, transcription, pages: null, consolidated: true },
    bookIndex: index,
  };
}

function bookGraphUpdate(
  id: string, book: string, snapshot: ConsolidationSnapshot, accepted?: AcceptedBookBatch,
): VaultBookGraphWrite {
  const batches = [...snapshot.imports.map(({ batch }) => batch), ...(accepted ? [accepted.batch] : [])];
  const merged = mergeBookGraph(id, snapshot.originals, snapshot.current?.bookIndex ?? emptyIndex, batches, () => crypto.randomUUID());
  const manifest = consolidatedBookManifest(id, book, snapshot, merged.index, accepted);
  const expectedManifest = snapshot.raw ? JSON.stringify(JSON.parse(snapshot.raw)) : "null";
  return { directory: snapshot.directory, expectedManifest, manifest, notes: merged.notes };
}

/** Imports prior book graphs and optionally appends one accepted analysis atomically.
 * @example await consolidateBookGraph(files, book)
 */
export async function consolidateBookGraph(
  files: BookGraphFiles, book: string, accepted?: AcceptedBookBatch,
): Promise<{ id: string } | null> {
  const vault = await files.getPath();
  if (!vault) return null;
  const id = await bookGraphId(book);
  const snapshot = await readConsolidation(files, book, id, vault);
  if (!accepted && !snapshot.imports.length) return snapshot.current ? { id } : null;
  if (!await files.writeBookGraph(bookGraphUpdate(id, book, snapshot, accepted))) {
    throw new Error("Book graph changed while merging. Retry with the current vault state.");
  }
  return { id };
}
