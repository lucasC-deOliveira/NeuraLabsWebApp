import { useEffect, useMemo, useState } from "react";
import { XIcon, NetworkIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { computeGraphMetrics } from "@/lib/graph-metrics";
import type { SimNode } from "@/modules/graph/infra/layout/force-layout.engine";
import type { GraphEdgeType } from "@/modules/graph/domain/types/graph.types";
import { DashboardCharts } from "./DashboardCharts";
import { DashboardFilters, type DashboardFilterState } from "./DashboardFilters";

// Constantes estáveis para evitar re-renders e re-cálculos quando o painel está fechado.
// filteredData e allTypes retornam estas refs — downstream memos não re-executam.
const EMPTY_DATA = { nodes: [] as SimNode[], edges: [] as GraphEdgeType[] };
const EMPTY_TYPES: string[] = [];

interface GraphDashboardProps {
  open: boolean;
  onClose: () => void;
  nodes: SimNode[];
  edges: GraphEdgeType[];
  onFilteredIdsChange?: (ids: Set<string> | null) => void;
}

function applyDegreeFilter(ns: SimNode[], es: GraphEdgeType[], minDegree: number): { nodes: SimNode[]; edges: GraphEdgeType[] } {
  const degMap = new Map<string, number>(ns.map((n) => [n.id, 0]));
  for (const e of es) {
    degMap.set(e.source, (degMap.get(e.source) ?? 0) + 1);
    degMap.set(e.target, (degMap.get(e.target) ?? 0) + 1);
  }
  const keptNodes = ns.filter((n) => (degMap.get(n.id) ?? 0) >= minDegree);
  const keptIds = new Set(keptNodes.map((n) => n.id));
  return { nodes: keptNodes, edges: es.filter((e) => keptIds.has(e.source) && keptIds.has(e.target)) };
}

function filterNodes(nodes: SimNode[], filters: DashboardFilterState): SimNode[] {
  const q = filters.search.toLowerCase().trim();
  return nodes.filter((n) => {
    if (filters.activeTypes.size > 0 && !filters.activeTypes.has(n.group)) return false;
    const d = Math.round(n.dominio * 100);
    if (d < filters.minDominio || d > filters.maxDominio) return false;
    return !q || n.label.toLowerCase().includes(q);
  });
}

function computeFilteredData(nodes: SimNode[], edges: GraphEdgeType[], filters: DashboardFilterState): { nodes: SimNode[]; edges: GraphEdgeType[] } {
  const ns = filterNodes(nodes, filters);
  const nodeSet = new Set(ns.map((n) => n.id));
  const es = edges.filter((e) => nodeSet.has(e.source) && nodeSet.has(e.target));
  return filters.minDegree > 0 ? applyDegreeFilter(ns, es, filters.minDegree) : { nodes: ns, edges: es };
}

export function GraphDashboard({ open, onClose, nodes, edges, onFilteredIdsChange }: GraphDashboardProps) {
  const [activeTypes, setActiveTypes] = useState<Set<string>>(new Set());
  const [minDominio, setMinDominio] = useState(0);
  const [maxDominio, setMaxDominio] = useState(100);
  const [minDegree, setMinDegree] = useState(0);
  const [search, setSearch] = useState("");
  const [prevOpen, setPrevOpen] = useState(false);

  const filters: DashboardFilterState = { activeTypes, minDominio, maxDominio, minDegree, search };

  // Reset filters when closing — during render (react-hooks v7 forbids synchronous setState in effects).
  if (open !== prevOpen) {
    setPrevOpen(open);
    if (!open) { setActiveTypes(new Set()); setMinDominio(0); setMaxDominio(100); setMinDegree(0); setSearch(""); }
  }

  const allTypes = useMemo(
    () => (open ? [...new Set(nodes.map((n) => n.group))].sort() : EMPTY_TYPES),
    [open, nodes],
  );

  const toggleType = (type: string): void =>
    setActiveTypes((prev) => {
      const next = new Set(prev);
      if (next.has(type)) next.delete(type);
      else next.add(type);
      return next;
    });

  const hasFilters = activeTypes.size > 0 || minDominio > 0 || maxDominio < 100 || minDegree > 0 || search.trim() !== "";

  const clearFilters = (): void => {
    setActiveTypes(new Set());
    setMinDominio(0);
    setMaxDominio(100);
    setMinDegree(0);
    setSearch("");
  };

  // Quando fechado: ref estável EMPTY_DATA → m não re-executa → charts não re-renderam a cada frame de física.
  const filteredData = useMemo(
    () => (open ? computeFilteredData(nodes, edges, filters) : EMPTY_DATA),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [open, nodes, edges, activeTypes, minDominio, maxDominio, minDegree, search],
  );

  useEffect(() => {
    if (!onFilteredIdsChange) return;
    onFilteredIdsChange(hasFilters ? new Set(filteredData.nodes.map((n) => n.id)) : null);
  }, [filteredData, hasFilters, onFilteredIdsChange]);

  const m = useMemo(() => computeGraphMetrics(filteredData.nodes, filteredData.edges), [filteredData]);

  return (
    <div
      className={`fixed top-0 right-0 h-full w-[440px] z-30 flex flex-col bg-background border-l shadow-2xl transition-transform duration-300 ease-in-out ${open ? "translate-x-0" : "translate-x-full"}`}
    >
      <div className="flex items-center justify-between px-4 py-3 border-b shrink-0">
        <div className="flex items-center gap-2">
          <NetworkIcon className="size-4 text-primary" />
          <span className="font-semibold text-sm">Analytics do Grafo</span>
        </div>
        <Button variant="ghost" size="icon" className="size-7" onClick={onClose}>
          <XIcon className="size-4" />
        </Button>
      </div>

      <DashboardFilters
        filters={filters}
        allTypes={allTypes}
        hasFilters={hasFilters}
        filteredCounts={{ nodes: filteredData.nodes.length, edges: filteredData.edges.length }}
        totalCounts={{ nodes: nodes.length, edges: edges.length }}
        onToggleType={toggleType}
        onClear={clearFilters}
        onSearch={setSearch}
        onMinDegree={setMinDegree}
        onMinDominio={setMinDominio}
        onMaxDominio={setMaxDominio}
      />

      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-5 text-sm">
        <DashboardCharts m={m} />
        <div className="h-4" />
      </div>
    </div>
  );
}
