"use client";

import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectTrigger, SelectValue, selectItems } from "@/components/ui/select";
import { SearchIcon, XIcon, FilterXIcon } from "lucide-react";
import { topicosOfAssunto, type ConceptTagOptions } from "@/lib/concept-tag-filters";
import {
  countActiveQuestaoFilters,
  TIPO_LABELS,
  type QuestaoCriteria,
  type QuestaoSort,
} from "../../domain/services/questao-filters";
import type { TipoQuestao } from "../../domain/questao.types";

interface QuestoesFiltersProps {
  criteria: QuestaoCriteria;
  // Só o que existe na lista.
  tipos: TipoQuestao[];
  tags: ConceptTagOptions;
  onPatch: (patch: Partial<QuestaoCriteria>) => void;
  onClear: () => void;
}

// Mapas valor→rótulo: alimentam os itens e o `items` do Select (sem ele, o gatilho
// mostra o valor cru — ex.: "recentes").
const SORT_ITEMS: Record<string, string> = {
  recentes: "Mais recentes",
  enunciado: "Enunciado (A–Z)",
  tipo: "Tipo",
};

const namedItems = (todos: string, options: Array<{ id: string; nome: string }>): Record<string, string> =>
  Object.fromEntries([["", todos], ...options.map((o) => [o.id, o.nome])]);

const tipoItems = (tipos: TipoQuestao[]): Record<string, string> =>
  namedItems("Todos os tipos", tipos.map((t) => ({ id: t, nome: TIPO_LABELS[t] })));

const conceitoItems = (conceitos: string[]): Record<string, string> =>
  namedItems("Todos os conceitos", conceitos.map((c) => ({ id: c, nome: c })));

// Fora do componente para não pesar na complexidade dele (gate: máx. 12).
function isDirty(criteria: QuestaoCriteria): boolean {
  return countActiveQuestaoFilters(criteria) > 0 || criteria.search.trim() !== "";
}

export function QuestoesFilters({ criteria, tipos, tags, onPatch, onClear }: QuestoesFiltersProps) {
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
            placeholder="Buscar por enunciado, alternativa, explicação ou conceito..."
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
          onValueChange={(v) => onPatch({ sortBy: (v ?? "recentes") as QuestaoSort })}
        >
          <SelectTrigger className="sm:w-[180px]"><SelectValue /></SelectTrigger>
          <SelectContent>{selectItems(SORT_ITEMS)}</SelectContent>
        </Select>

        {tipos.length > 1 && (
          <Select
            items={tiposMap}
            value={criteria.tipo}
            onValueChange={(v) => onPatch({ tipo: (v ?? "") as TipoQuestao | "" })}
          >
            <SelectTrigger className="sm:w-[190px]"><SelectValue /></SelectTrigger>
            <SelectContent>{selectItems(tiposMap)}</SelectContent>
          </Select>
        )}

        {isDirty(criteria) && (
          <Button variant="ghost" className="h-9" onClick={onClear} title="Limpar filtros">
            <FilterXIcon className="size-3.5 mr-1" />
            Limpar
          </Button>
        )}
      </div>

      {tags.conceitos.length > 0 && (
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

          <Select items={conceitos} value={criteria.conceito} onValueChange={(v) => onPatch({ conceito: v ?? "" })}>
            <SelectTrigger className="sm:w-[180px]"><SelectValue /></SelectTrigger>
            <SelectContent>{selectItems(conceitos)}</SelectContent>
          </Select>
        </div>
      )}
    </div>
  );
}
