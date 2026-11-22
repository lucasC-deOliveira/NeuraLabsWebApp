import { desktop } from "@/lib/vault-bridge";
import { bookEdgeKey } from "@/lib/book-graph-view";
import { vaultToGraphEdges, vaultToGraphNode } from "@/lib/vault-sync";
import { graphVaultEntries } from "@/modules/graph/infra/vault/graph-vault-reader";
import { runForceLayout, type SimNode, type SimEdge } from "@/modules/graph/infra/layout/force-layout.engine";
import { bookGraphId } from "./consolidate-book-graph";
import { bookCitationLinks } from "./book-graph-provenance";

export type SyncedBookGraph =
  | { status: "missing" }
  | { status: "unanalyzed"; graphId: string }
  | { status: "ready"; graphId: string; nodes: SimNode[]; edges: SimEdge[]; quotes: Map<string, string[]> };

/** Loads and lays out only the nodes and relationships relevant to one book page. */
export async function readSyncedBookGraph(book: string, page: number): Promise<SyncedBookGraph> {
  const graphId = await bookGraphId(book);
  const snapshot = await desktop.vault.readBookGraphPage(graphId, page);
  if (snapshot.status !== "ready") return snapshot;
  const nodes = graphVaultEntries(snapshot.files, graphId).map(({ node }) => node);
  const edgeKeys = new Set(snapshot.edges);
  const edges = vaultToGraphEdges(nodes).filter(({ source, type, target }) => edgeKeys.has(bookEdgeKey(source, type, target)));
  const layout = runForceLayout(nodes.map((node) => vaultToGraphNode(node)), edges, 540, 420, nodes.length > 100 ? 18 : 60);
  const quotes = new Map(nodes.map((node) => [node.id, [...new Set(bookCitationLinks(node)
    .filter((citation) => citation.book === book && citation.quote).map(({ quote }) => quote))]]));
  return { status: "ready", graphId, ...layout, quotes };
}
