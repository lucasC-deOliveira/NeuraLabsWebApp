import { useEffect, useMemo, useState } from "react";
import type { BookGraphIndex } from "@contracts/book-graph-source";
import { desktop } from "@/lib/vault-bridge";
import { bookPageNumbers, filterBookGraphPages, type BookGraphViewFilter } from "@/lib/book-graph-view";
import { decodeVaultGraphManifest, existingVaultGraphDirectory, VAULT_GRAPH_MANIFEST } from "@/lib/vault-graph-manifest";

interface BookGraphView {
  index: BookGraphIndex | null;
  filter: BookGraphViewFilter | null;
}

async function loadBookGraphIndex(graphId: string): Promise<BookGraphIndex | null> {
  const directory = await existingVaultGraphDirectory(graphId);
  if (!directory) return null;
  const raw = await desktop.vault.readFile(directory, VAULT_GRAPH_MANIFEST);
  return decodeVaultGraphManifest(raw, graphId)?.bookIndex ?? null;
}

/** Reads the book index separately from graph layout so switching pages only filters the view. */
export function useBookGraphView(graphId: string, selection: string): BookGraphView {
  const [loaded, setLoaded] = useState<{ id: string; index: BookGraphIndex } | null>(null);
  useEffect(() => {
    if (!graphId.startsWith("book-")) return;
    let active = true;
    void loadBookGraphIndex(graphId).then((index) => {
      if (active && index) setLoaded({ id: graphId, index });
    }).catch(() => undefined);
    return (): void => { active = false; };
  }, [graphId]);
  const index = loaded?.id === graphId ? loaded.index : null;
  const filter = useMemo(() => {
    if (!index || !selection) return null;
    const pages = bookPageNumbers(selection, index.coverage.at(-1) ?? 0) ?? [];
    return filterBookGraphPages(index, pages.filter((page) => index.coverage.includes(page)));
  }, [index, selection]);
  return { index, filter };
}
