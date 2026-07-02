import { FilterIcon, SearchIcon } from "lucide-react";
import { Input } from "@/components/ui/input";
import { TYPE_COLORS, TYPE_LABELS } from "@/lib/graph-metrics";

const DEGREE_OPTIONS = [0, 1, 2, 3, 5, 8];

export interface DashboardFilterState {
  activeTypes: Set<string>;
  minDominio: number;
  maxDominio: number;
  minDegree: number;
  search: string;
}

interface DashboardFiltersProps {
  filters: DashboardFilterState;
  allTypes: string[];
  hasFilters: boolean;
  filteredCounts: { nodes: number; edges: number };
  totalCounts: { nodes: number; edges: number };
  onToggleType: (type: string) => void;
  onClear: () => void;
  onSearch: (v: string) => void;
  onMinDegree: (v: number) => void;
  onMinDominio: (v: number) => void;
  onMaxDominio: (v: number) => void;
}

function TypeChips({
  allTypes,
  activeTypes,
  onToggleType,
}: {
  allTypes: string[];
  activeTypes: Set<string>;
  onToggleType: (type: string) => void;
}) {
  if (allTypes.length === 0) return null;
  return (
    <div className="flex flex-wrap gap-1">
      {allTypes.map((type) => {
        const shown = activeTypes.size === 0 || activeTypes.has(type);
        return (
          <button
            key={type}
            onClick={() => onToggleType(type)}
            className="px-2 py-0.5 rounded-full text-[10px] font-medium border transition-all"
            style={shown
              ? { backgroundColor: TYPE_COLORS[type] ?? "#888", borderColor: "transparent", color: "#fff", opacity: 1 }
              : { backgroundColor: "transparent", borderColor: "hsl(var(--border))", color: "hsl(var(--muted-foreground))", opacity: 0.6 }}
          >
            {TYPE_LABELS[type] ?? type}
          </button>
        );
      })}
    </div>
  );
}

function MasteryRange({
  filters,
  onMinDominio,
  onMaxDominio,
}: {
  filters: DashboardFilterState;
  onMinDominio: (v: number) => void;
  onMaxDominio: (v: number) => void;
}) {
  return (
    <div className="space-y-1">
      <p className="text-[10px] text-muted-foreground font-medium">Maestria</p>
      <div className="grid grid-cols-[36px_1fr_34px] items-center gap-2">
        <span className="text-[10px] text-muted-foreground text-right">Mín</span>
        <input type="range" min={0} max={100} step={5} value={filters.minDominio}
          onChange={(e) => onMinDominio(Math.min(+e.target.value, filters.maxDominio - 5))}
          className="w-full accent-primary h-1" />
        <span className="text-[10px] font-medium tabular-nums">{filters.minDominio}%</span>
      </div>
      <div className="grid grid-cols-[36px_1fr_34px] items-center gap-2">
        <span className="text-[10px] text-muted-foreground text-right">Máx</span>
        <input type="range" min={0} max={100} step={5} value={filters.maxDominio}
          onChange={(e) => onMaxDominio(Math.max(+e.target.value, filters.minDominio + 5))}
          className="w-full accent-primary h-1" />
        <span className="text-[10px] font-medium tabular-nums">{filters.maxDominio}%</span>
      </div>
    </div>
  );
}

export function DashboardFilters({
  filters,
  allTypes,
  hasFilters,
  filteredCounts,
  totalCounts,
  onToggleType,
  onClear,
  onSearch,
  onMinDegree,
  onMinDominio,
  onMaxDominio,
}: DashboardFiltersProps) {
  return (
    <div className="border-b px-4 py-3 space-y-2.5 shrink-0">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5">
          <FilterIcon className="size-3 text-muted-foreground" />
          <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Filtros</span>
        </div>
        {hasFilters && (
          <button onClick={onClear} className="text-[10px] text-primary hover:underline leading-none">
            Limpar tudo
          </button>
        )}
      </div>

      <TypeChips allTypes={allTypes} activeTypes={filters.activeTypes} onToggleType={onToggleType} />

      <div className="flex gap-2 items-center">
        <div className="relative flex-1">
          <SearchIcon className="absolute left-2 top-1/2 -translate-y-1/2 size-3 text-muted-foreground pointer-events-none" />
          <Input value={filters.search} onChange={(e) => onSearch(e.target.value)} placeholder="buscar nó..." className="pl-6 h-7 text-[11px]" />
        </div>
        <select
          value={filters.minDegree}
          onChange={(e) => onMinDegree(+e.target.value)}
          className="h-7 text-[11px] px-1.5 rounded-md border border-input bg-background text-foreground cursor-pointer"
        >
          {DEGREE_OPTIONS.map((d) => <option key={d} value={d}>Grau ≥ {d}</option>)}
        </select>
      </div>

      <MasteryRange filters={filters} onMinDominio={onMinDominio} onMaxDominio={onMaxDominio} />

      {hasFilters && (
        <div className="flex items-center gap-1.5 text-[11px] text-primary font-medium">
          <span className="size-1.5 rounded-full bg-primary shrink-0 inline-block" />
          {filteredCounts.nodes} nós · {filteredCounts.edges} relações
          <span className="text-muted-foreground font-normal ml-0.5">
            (de {totalCounts.nodes} · {totalCounts.edges})
          </span>
        </div>
      )}
    </div>
  );
}
