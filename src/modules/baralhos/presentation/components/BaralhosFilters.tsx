"use client";

import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { SearchIcon, XIcon, FilterXIcon, FlameIcon } from "lucide-react";
import type { BaralhoOrigin } from "../../domain/baralho.types";
import {
  countActiveBaralhoFilters,
  type BaralhoCriteria,
  type BaralhoSort,
} from "../../domain/services/baralho-filters";

interface BaralhosFiltersProps {
  criteria: BaralhoCriteria;
  origins: BaralhoOrigin[];
  onPatch: (patch: Partial<BaralhoCriteria>) => void;
  onClear: () => void;
}

// Fora do componente para não pesar na complexidade dele (gate: máx. 12).
function isDirty(criteria: BaralhoCriteria): boolean {
  return countActiveBaralhoFilters(criteria) > 0 || criteria.search.trim() !== "";
}

export function BaralhosFilters({ criteria, origins, onPatch, onClear }: BaralhosFiltersProps) {
  return (
    <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
      <div className="relative flex-1">
        <SearchIcon className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          placeholder="Buscar baralho pelo titulo..."
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

      <Button
        variant={criteria.pendingOnly ? "default" : "outline"}
        className="h-9"
        title="Mostrar só baralhos com cartões para estudar hoje"
        onClick={() => onPatch({ pendingOnly: !criteria.pendingOnly })}
      >
        <FlameIcon className="size-3.5 mr-1" />
        Para estudar
      </Button>

      {origins.length > 0 && (
        <Select value={criteria.grafoId} onValueChange={(v) => onPatch({ grafoId: v ?? "" })}>
          <SelectTrigger className="sm:w-[170px]"><SelectValue placeholder="Todos os grafos" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="">Todos os grafos</SelectItem>
            {origins.map((origem) => (
              <SelectItem key={origem.grafoId} value={origem.grafoId}>{origem.nome}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      )}

      <Select value={criteria.sortBy} onValueChange={(v) => onPatch({ sortBy: v as BaralhoSort })}>
        <SelectTrigger className="sm:w-[170px]"><SelectValue /></SelectTrigger>
        <SelectContent>
          <SelectItem value="recentes">Mais recentes</SelectItem>
          <SelectItem value="alfabetica">Alfabetica</SelectItem>
          <SelectItem value="cartoes">Mais cartões</SelectItem>
          <SelectItem value="estudar">Mais para estudar</SelectItem>
        </SelectContent>
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
