"use client";

import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectTrigger, SelectValue, selectItems } from "@/components/ui/select";
import { SearchIcon, XIcon, FilterXIcon } from "lucide-react";
import {
  countActiveCardFilters,
  formatTipoLabel,
  type BaralhoCardCriteria,
  type BaralhoCardSort,
} from "../../domain/services/baralho-card-filters";
import { topicosOfAssunto, type ConceptTagOptions } from "@/lib/concept-tag-filters";

interface BaralhoCardsFiltersProps {
  criteria: BaralhoCardCriteria;
  // Só o que existe neste baralho.
  tipos: string[];
  tags: ConceptTagOptions;
  onPatch: (patch: Partial<BaralhoCardCriteria>) => void;
  onClear: () => void;
}

// Mapas valor→rótulo: alimentam os itens e o `items` do Select (sem ele, o gatilho
// mostra o valor cru — ex.: "baralho").
const SORT_ITEMS: Record<string, string> = {
  baralho: "Ordem do baralho",
  conceito: "Conceito (A–Z)",
  tipo: "Tipo",
};

const namedItems = (todos: string, options: Array<{ id: string; nome: string }>): Record<string, string> =>
  Object.fromEntries([["", todos], ...options.map((o) => [o.id, o.nome])]);

const tipoItems = (tipos: string[]): Record<string, string> =>
  namedItems("Todos os tipos", tipos.map((t) => ({ id: t, nome: formatTipoLabel(t) })));

const conceitoItems = (conceitos: string[]): Record<string, string> =>
  namedItems("Todos os conceitos", conceitos.map((c) => ({ id: c, nome: c })));

// Fora do componente para não pesar na complexidade dele (gate: máx. 12).
function isDirty(criteria: BaralhoCardCriteria): boolean {
  return countActiveCardFilters(criteria) > 0 || criteria.search.trim() !== "";
}

export function BaralhoCardsFilters({
  criteria, tipos, tags, onPatch, onClear,
}: BaralhoCardsFiltersProps) {
  const assuntos = namedItems("Todos os assuntos", tags.assuntos);
  const topicos = namedItems("Todos os tópicos", topicosOfAssunto(tags, criteria.assuntoId));
  const conceitos = conceitoItems(tags.conceitos);
  const tiposMap = tipoItems(tipos);

  return (
    <div className="space-y-2">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <SearchIcon className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Buscar por pergunta, resposta ou conceito..."
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
          onValueChange={(v) => onPatch({ sortBy: (v ?? "baralho") as BaralhoCardSort })}
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

      <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
        {tags.assuntos.length > 0 && (
          // Trocar de assunto zera o tópico: um tópico de outro assunto não faria sentido.
          <Select
            items={assuntos}
            value={criteria.assuntoId}
            onValueChange={(v) => onPatch({ assuntoId: v ?? "", topicoId: "" })}
          >
            <SelectTrigger className="sm:w-[180px]"><SelectValue /></SelectTrigger>
            <SelectContent>{selectItems(assuntos)}</SelectContent>
          </Select>
        )}

        {tags.topicos.length > 0 && (
          <Select items={topicos} value={criteria.topicoId} onValueChange={(v) => onPatch({ topicoId: v ?? "" })}>
            <SelectTrigger className="sm:w-[180px]"><SelectValue /></SelectTrigger>
            <SelectContent>{selectItems(topicos)}</SelectContent>
          </Select>
        )}

        {tags.conceitos.length > 0 && (
          <Select items={conceitos} value={criteria.conceito} onValueChange={(v) => onPatch({ conceito: v ?? "" })}>
            <SelectTrigger className="sm:w-[180px]"><SelectValue /></SelectTrigger>
            <SelectContent>{selectItems(conceitos)}</SelectContent>
          </Select>
        )}

        {tipos.length > 0 && (
          <Select items={tiposMap} value={criteria.tipo} onValueChange={(v) => onPatch({ tipo: v ?? "" })}>
            <SelectTrigger className="sm:w-[170px] capitalize"><SelectValue /></SelectTrigger>
            <SelectContent>{selectItems(tiposMap)}</SelectContent>
          </Select>
        )}
      </div>
    </div>
  );
}
