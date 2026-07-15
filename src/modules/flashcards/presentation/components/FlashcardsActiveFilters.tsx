"use client";

import { Badge } from "@/components/ui/badge";
import { XIcon } from "lucide-react";
import type { AssuntoOption } from "../../domain/flashcard.types";
import type { FlashcardCriteria } from "../../domain/services/flashcard-filters";
import { TIPO_LABELS } from "../constants/tipo";

const STATUS_LABELS: Record<string, string> = { "not-due": "Em dia", overdue: "Atrasados" };
const SORT_LABELS: Record<string, string> = { difficulty: "Dificuldade", interval: "Intervalo", alpha: "Alfabetica" };

interface FlashcardsActiveFiltersProps {
  criteria: FlashcardCriteria;
  filterData: AssuntoOption[];
  availableTopicos: Array<{ id: string; nome: string }>;
  onClearAssunto: () => void;
  onClearTopico: () => void;
  onClearTipo: () => void;
  onClearStatus: () => void;
  onClearSort: () => void;
}

export function FlashcardsActiveFilters({
  criteria, filterData, availableTopicos, onClearAssunto, onClearTopico, onClearTipo, onClearStatus, onClearSort,
}: FlashcardsActiveFiltersProps) {
  return (
    <div className="flex flex-wrap items-center gap-1.5">
      <span className="text-[10px] text-zinc-500">Ativos:</span>
      {criteria.assuntoFilter && (
        <Badge variant="secondary" className="text-[10px] h-5 px-1.5 gap-1 flex items-center">
          Materia: {filterData.find((a) => a.id === criteria.assuntoFilter)?.nome}
          <XIcon className="size-3 cursor-pointer" onClick={onClearAssunto} />
        </Badge>
      )}
      {criteria.topicoFilter && (
        <Badge variant="secondary" className="text-[10px] h-5 px-1.5 gap-1 flex items-center">
          Topico: {availableTopicos.find((t) => t.id === criteria.topicoFilter)?.nome}
          <XIcon className="size-3 cursor-pointer" onClick={onClearTopico} />
        </Badge>
      )}
      {criteria.tipoFilter && (
        <Badge variant="secondary" className="text-[10px] h-5 px-1.5 gap-1 flex items-center">
          Tipo: {TIPO_LABELS[criteria.tipoFilter]}
          <XIcon className="size-3 cursor-pointer" onClick={onClearTipo} />
        </Badge>
      )}
      {criteria.statusFilter !== "all" && (
        <Badge variant="secondary" className="text-[10px] h-5 px-1.5 gap-1 flex items-center">
          Status: {STATUS_LABELS[criteria.statusFilter] ?? criteria.statusFilter}
          <XIcon className="size-3 cursor-pointer" onClick={onClearStatus} />
        </Badge>
      )}
      {criteria.sortBy !== "date" && (
        <Badge variant="secondary" className="text-[10px] h-5 px-1.5 gap-1 flex items-center">
          Ordem: {SORT_LABELS[criteria.sortBy] ?? criteria.sortBy}
          <XIcon className="size-3 cursor-pointer" onClick={onClearSort} />
        </Badge>
      )}
    </div>
  );
}
