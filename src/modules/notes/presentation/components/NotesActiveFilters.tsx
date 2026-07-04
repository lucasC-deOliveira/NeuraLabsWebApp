"use client";

import { Badge } from "@/components/ui/badge";
import { CalendarIcon, BrainIcon, XIcon } from "lucide-react";
import type { NotesFilterCriteria } from "../../domain/services/nota-filters";

const TIME_LABELS: Record<string, string> = { today: "Hoje", week: "Semana", month: "Mes", older: "Antigas" };

interface NotesActiveFiltersProps {
  criteria: NotesFilterCriteria;
  allConcepts: Array<[string, string]>;
  onClearConcept: () => void;
  onClearTime: () => void;
  onClearFc: () => void;
  onClearAll: () => void;
}

export function NotesActiveFilters({
  criteria, allConcepts, onClearConcept, onClearTime, onClearFc, onClearAll,
}: NotesActiveFiltersProps) {
  return (
    <div className="flex flex-wrap gap-1.5 items-center">
      {criteria.conceptFilter && (
        <Badge variant="secondary" className="text-[10px] gap-1 px-1.5">
          {allConcepts.find((c) => c[0] === criteria.conceptFilter)?.[1] || "Conceito"}
          <button type="button" onClick={onClearConcept}><XIcon className="size-3 ml-0.5" /></button>
        </Badge>
      )}
      {criteria.timeFilter !== "all" && (
        <Badge variant="secondary" className="text-[10px] gap-1 px-1.5">
          <CalendarIcon className="size-3" />
          {TIME_LABELS[criteria.timeFilter]}
          <button type="button" onClick={onClearTime}><XIcon className="size-3 ml-0.5" /></button>
        </Badge>
      )}
      {criteria.fcFilter !== "all" && (
        <Badge variant="secondary" className="text-[10px] gap-1 px-1.5">
          <BrainIcon className="size-3" />
          {criteria.fcFilter === "has-fc" ? "Com FC" : "Sem FC"}
          <button type="button" onClick={onClearFc}><XIcon className="size-3 ml-0.5" /></button>
        </Badge>
      )}
      <button type="button" onClick={onClearAll} className="text-[10px] text-zinc-400 hover:text-zinc-600 ml-1 underline">Limpar tudo</button>
    </div>
  );
}
