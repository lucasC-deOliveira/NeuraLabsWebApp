import { useEffect, useMemo, useRef, useState, type ReactElement } from "react";
import { useTheme } from "next-themes";
import { Link } from "@/components/link";
import { GraphRenderer } from "@/modules/graph/presentation/components/GraphRenderer";
import type { SimNode } from "@/modules/graph/infra/layout/force-layout.engine";
import { readSyncedBookGraph, type SyncedBookGraph as BookGraphSnapshot } from "../infra/read-synced-book-graph";
import type { TranscriptionEvidence } from "./TranscriptionEvidenceHighlight";

type GraphLoad = { page: number; result: BookGraphSnapshot | "failed" };

/** Shows the book graph projection whose source is the shared reader page. */
export function SyncedBookGraph({ book, page, onEvidence }: {
  book: string; page: number; onEvidence: (evidence: TranscriptionEvidence | null) => void;
}): ReactElement {
  const [loaded, setLoaded] = useState<GraphLoad>();
  useEffect(() => {
    let active = true;
    void readSyncedBookGraph(book, page).then(
      (result) => { if (active) setLoaded({ page, result }); },
      () => { if (active) setLoaded({ page, result: "failed" }); },
    );
    return (): void => { active = false; };
  }, [book, page]);
  if (loaded?.page !== page) return <p role="status">Carregando grafo da página…</p>;
  const { result } = loaded;
  if (result === "failed") return <p role="alert">Não foi possível abrir o grafo da página.</p>;
  if (result.status === "missing") return <p>Este livro ainda não tem um grafo de análise.</p>;
  if (result.status === "unanalyzed") return <p>A página {page} ainda não foi analisada.</p>;
  if (!result.nodes.length) return <p>A análise da página {page} não tem nós vinculados a ela.</p>;
  return <PageGraphCanvas key={page} page={page} snapshot={result} onEvidence={onEvidence} />;
}

function graphBounds(nodes: SimNode[]): { left: number; right: number; top: number; bottom: number } {
  return nodes.reduce((bounds, node) => ({
    left: Math.min(bounds.left, node.x - node.width / 2),
    right: Math.max(bounds.right, node.x + node.width / 2),
    top: Math.min(bounds.top, node.y - node.height / 2),
    bottom: Math.max(bounds.bottom, node.y + node.height / 2),
  }), { left: Infinity, right: -Infinity, top: Infinity, bottom: -Infinity });
}

function PageGraphCanvas({ page, snapshot, onEvidence }: {
  page: number; snapshot: Extract<BookGraphSnapshot, { status: "ready" }>;
  onEvidence: (evidence: TranscriptionEvidence | null) => void;
}): ReactElement {
  const viewport = useRef<HTMLDivElement>(null);
  const canvas = useRef<HTMLCanvasElement>(null);
  const { resolvedTheme } = useTheme();
  const [size, setSize] = useState({ width: 340, height: 420 });
  const [picked, setPicked] = useState<SimNode | null>(null);
  const [factor, setFactor] = useState(1);
  const bounds = useMemo(() => graphBounds(snapshot.nodes), [snapshot.nodes]);
  useEffect(() => {
    const element = viewport.current;
    if (!element) return;
    const observer = new ResizeObserver(([entry]) => {
      setSize({ width: entry.contentRect.width, height: entry.contentRect.height });
    });
    observer.observe(element);
    return (): void => observer.disconnect();
  }, []);
  const zoom = Math.max(0.12, Math.min(1.1, (size.width - 28) / (bounds.right - bounds.left),
    (size.height - 28) / (bounds.bottom - bounds.top))) * factor;
  const pan = {
    x: (size.width - (bounds.left + bounds.right) * zoom) / 2,
    y: (size.height - (bounds.top + bounds.bottom) * zoom) / 2,
  };
  const query = new URLSearchParams({ pages: String(page) });
  if (picked) { query.set("focus", picked.id); query.set("from", "reader"); }
  const showEvidence = (id: string | null, pinned: boolean): void => {
    const quotes = id ? snapshot.quotes.get(id) : null;
    onEvidence(quotes?.length ? { quotes, pinned } : null);
  };
  const chooseNode = (node: SimNode | null): void => {
    setPicked(node);
    showEvidence(node?.id ?? null, true);
  };
  return (
    <div className="space-y-2">
      <div ref={viewport} className="relative h-[24rem] overflow-hidden rounded-md border">
        <GraphRenderer nodes={snapshot.nodes} edges={snapshot.edges} isDark={resolvedTheme === "dark"} svgRef={canvas}
          tool="select" zoom={zoom} pan={pan} selectedNodeIds={new Set(picked ? [picked.id] : [])} marquee={null}
          onNodeClick={chooseNode} onNodeDragStart={() => undefined} onPanStart={() => undefined}
          onMarqueeStart={() => undefined} onNodeHover={(id) => { if (!picked) showEvidence(id, false); }}
          onWheel={(event) => setFactor((value) => Math.min(3, Math.max(0.65, value * (event.deltaY < 0 ? 1.12 : 0.89))))} />
      </div>
      {picked && <p className="text-sm font-medium">{picked.label}</p>}
      <Link className="text-sm underline" href={`/graph/${encodeURIComponent(snapshot.graphId)}?${query}`}>
        {picked ? "Abrir nó no grafo" : "Abrir grafo da página"}
      </Link>
    </div>
  );
}
