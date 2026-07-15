"use client";

import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectTrigger, SelectValue, selectItems } from "@/components/ui/select";
import { SearchIcon, XIcon, FilterXIcon } from "lucide-react";
import {
  countActiveProvaFilters,
  type ProvaCriteria,
  type ProvaSort,
} from "../../domain/services/prova-filters";

interface ProvasFiltersProps {
  criteria: ProvaCriteria;
  onPatch: (patch: Partial<ProvaCriteria>) => void;
  onClear: () => void;
}

// Mapa valor→rótulo: alimenta os itens e o `items` do Select (sem ele, o gatilho
// mostra o valor cru — ex.: "recentes").
const SORT_ITEMS: Record<string, string> = {
  recentes: "Mais recentes",
  alfabetica: "Título (A–Z)",
  questoes: "Mais questões",
};

const isDirty = (criteria: ProvaCriteria): boolean =>
  countActiveProvaFilters(criteria) > 0 || criteria.search.trim() !== "";

export function ProvasFilters({ criteria, onPatch, onClear }: ProvasFiltersProps) {
  return (
    <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
      <div className="relative flex-1">
        <SearchIcon className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          placeholder="Buscar por título ou descrição..."
          className="pl-9"
          value={criteria.search}
          onChange={(e) => onPatch({ search: e.target.value })}
        />
        {criteria.search && (
          <button
            type="button"
            onClick={() => onPatch({ search: "" })}
            className="absolute right-2.5 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-600"
            title="Limpar busca"
          >
            <XIcon className="size-3.5 cursor-pointer" />
          </button>
        )}
      </div>

      <Select
        items={SORT_ITEMS}
        value={criteria.sortBy}
        onValueChange={(v) => onPatch({ sortBy: (v ?? "recentes") as ProvaSort })}
      >
        <SelectTrigger className="sm:w-[180px]"><SelectValue /></SelectTrigger>
        <SelectContent>{selectItems(SORT_ITEMS)}</SelectContent>
      </Select>

      {isDirty(criteria) && (
        <Button variant="ghost" className="h-9" onClick={onClear} title="Limpar filtros">
          <FilterXIcon className="size-3.5 mr-1" />
          Limpar
        </Button>
      )}
    </div>
  );
}
