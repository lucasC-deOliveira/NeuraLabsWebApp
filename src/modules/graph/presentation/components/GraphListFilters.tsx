"use client";

import { useEffect, useState } from "react";
import { SearchIcon, FilterXIcon } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import type { GraphAssunto, GraphListParams, GraphSortField, GraphTypeFilter } from "../../domain/types/graph.types";

interface GraphListFiltersProps {
  params: GraphListParams;
  assuntos: GraphAssunto[];
  onFilter: (patch: Partial<GraphListParams>) => void;
}

// Mapas valor→rótulo: alimentam tanto os itens quanto o `items` do Base UI Select
// (sem `items`, o Value mostra o valor cru — ex.: "any" — até abrir o dropdown).
const TIPO_ITEMS: Record<string, string> = {
  todos: "Todos os tipos",
  raiz: "Apenas raízes",
  subgrafo: "Apenas subgrafos",
};
const PERIOD_ITEMS: Record<string, string> = {
  any: "Qualquer data",
  "7": "Últimos 7 dias",
  "30": "Últimos 30 dias",
  "365": "Último ano",
};
const SORT_ITEMS: Record<string, string> = {
  recentes: "Mais recentes",
  atualizados: "Atualizados recentemente",
  alfabetica: "Alfabética (A–Z)",
  subgrafos: "Mais subgrafos",
};

const itemsOf = (map: Record<string, string>) =>
  Object.entries(map).map(([value, label]) => (
    <SelectItem key={value} value={value}>{label}</SelectItem>
  ));

// Preset de período → data de criação mínima (ISO). "any"/inválido = qualquer data.
function periodToCreatedFrom(value: string): string | undefined {
  const days = Number(value);
  if (!days) return undefined;
  return new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString();
}

// Algum filtro/ordenação fora do padrão? (fora do componente p/ não somar complexidade)
function filtersActive(params: GraphListParams, text: string, period: string): boolean {
  return (
    !!text ||
    (!!params.tipo && params.tipo !== "todos") ||
    (!!params.sort && params.sort !== "recentes") ||
    period !== "any" ||
    (params.assuntoIds?.length ?? 0) > 0
  );
}

export function GraphListFilters({ params, assuntos, onFilter }: GraphListFiltersProps) {
  const [text, setText] = useState(params.q ?? "");
  const [period, setPeriod] = useState("any");
  const assuntoNames = Object.fromEntries(assuntos.map((a) => [a.id, a.nome]));
  const selectedAssuntos = params.assuntoIds ?? [];

  const isDirty = filtersActive(params, text, period);

  function resetFilters(): void {
    setText("");
    setPeriod("any");
    onFilter({ q: undefined, tipo: "todos", sort: "recentes", createdFrom: undefined, assuntoIds: undefined });
  }

  // Debounce da busca: só dispara o fetch 350ms após o usuário parar de digitar.
  useEffect(() => {
    const id = setTimeout(() => onFilter({ q: text.trim() || undefined }), 350);
    return () => clearTimeout(id);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [text]);

  return (
    <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center">
      <div className="relative flex-1 min-w-[200px]">
        <SearchIcon className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Buscar por nome ou descrição…"
          className="pl-9"
        />
      </div>

      <Select
        items={TIPO_ITEMS}
        value={params.tipo ?? "todos"}
        onValueChange={(v) => onFilter({ tipo: (v ?? "todos") as GraphTypeFilter })}
      >
        <SelectTrigger className="w-full sm:w-40"><SelectValue /></SelectTrigger>
        <SelectContent>{itemsOf(TIPO_ITEMS)}</SelectContent>
      </Select>

      <Select
        items={PERIOD_ITEMS}
        value={period}
        onValueChange={(v) => { const val = v ?? "any"; setPeriod(val); onFilter({ createdFrom: periodToCreatedFrom(val) }); }}
      >
        <SelectTrigger className="w-full sm:w-44"><SelectValue /></SelectTrigger>
        <SelectContent>{itemsOf(PERIOD_ITEMS)}</SelectContent>
      </Select>

      {assuntos.length > 0 && (
        <Select
          multiple
          items={assuntoNames}
          value={selectedAssuntos}
          onValueChange={(v) => onFilter({ assuntoIds: (v as string[]).length ? (v as string[]) : undefined })}
        >
          <SelectTrigger className="w-full sm:w-48">
            <SelectValue>
              {(v) => (Array.isArray(v) && v.length ? `${v.length} assunto${v.length === 1 ? "" : "s"}` : "Assuntos")}
            </SelectValue>
          </SelectTrigger>
          <SelectContent>
            {assuntos.map((a) => (<SelectItem key={a.id} value={a.id}>{a.nome}</SelectItem>))}
          </SelectContent>
        </Select>
      )}

      <Select
        items={SORT_ITEMS}
        value={params.sort ?? "recentes"}
        onValueChange={(v) => onFilter({ sort: (v ?? "recentes") as GraphSortField })}
      >
        <SelectTrigger className="w-full sm:w-48"><SelectValue /></SelectTrigger>
        <SelectContent>{itemsOf(SORT_ITEMS)}</SelectContent>
      </Select>

      {isDirty && (
        <Button
          variant="ghost"
          size="sm"
          onClick={resetFilters}
          className="gap-1.5 text-muted-foreground hover:text-foreground"
        >
          <FilterXIcon className="size-4" />
          Limpar filtros
        </Button>
      )}
    </div>
  );
}
