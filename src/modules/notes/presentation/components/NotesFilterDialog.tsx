"use client";

import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { FilterIcon } from "lucide-react";
import type {
  NotesFilterCriteria, TimeFilter, FcFilter, SortOrder,
} from "../../domain/services/nota-filters";

interface NotesFilterDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  criteria: NotesFilterCriteria;
  allConcepts: Array<[string, string]>;
  activeFilterCount: number;
  onConcept: (v: string) => void;
  onTime: (v: TimeFilter) => void;
  onFc: (v: FcFilter) => void;
  onSort: (v: SortOrder) => void;
  onClear: () => void;
}

function TimePill({ label, value, active, onChange }: {
  label: string; value: TimeFilter; active: TimeFilter; onChange: (v: TimeFilter) => void;
}) {
  const isActive = active === value;
  return (
    <button
      type="button"
      onClick={() => onChange(isActive ? "all" : value)}
      className={`px-2 py-1 rounded text-[10px] font-medium transition-colors ${isActive ? "bg-primary text-primary-foreground" : "bg-zinc-100 dark:bg-zinc-800 text-zinc-500 hover:text-zinc-700"}`}
    >
      {label}
    </button>
  );
}

export function NotesFilterDialog({
  open, onOpenChange, criteria, allConcepts, activeFilterCount,
  onConcept, onTime, onFc, onSort, onClear,
}: NotesFilterDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <Button variant="outline" className="relative sm:w-[160px]" onClick={() => onOpenChange(true)}>
        <FilterIcon className="size-4 mr-1.5" />
        Filtros
        {activeFilterCount > 0 && (
          <span className="absolute -top-1 -right-1 size-4 bg-primary text-[9px] text-primary-foreground rounded-full flex items-center justify-center">
            {activeFilterCount}
          </span>
        )}
      </Button>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Filtros</DialogTitle>
          <DialogDescription>Refine a lista de notas.</DialogDescription>
        </DialogHeader>
        <div className="space-y-5 mt-2">
          {allConcepts.length > 0 && (
            <div className="space-y-2">
              <Label>Conceito</Label>
              <Select value={criteria.conceptFilter} onValueChange={(v) => onConcept(v || "")}>
                <SelectTrigger><SelectValue placeholder="Todos os conceitos" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="">Todos</SelectItem>
                  {allConcepts.map(([id, nome]) => (
                    <SelectItem key={id} value={id}>{nome}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          <div className="space-y-2">
            <Label>Flashcards</Label>
            <Select value={criteria.fcFilter} onValueChange={(v) => onFc(v as FcFilter)}>
              <SelectTrigger><SelectValue placeholder="Todas" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas</SelectItem>
                <SelectItem value="has-fc">Com flashcards</SelectItem>
                <SelectItem value="no-fc">Sem flashcards</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Periodo</Label>
            <Select value={criteria.timeFilter} onValueChange={(v) => onTime(v as TimeFilter)}>
              <SelectTrigger><SelectValue placeholder="Qualquer data" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Qualquer</SelectItem>
                <SelectItem value="today">Hoje</SelectItem>
                <SelectItem value="week">Esta semana</SelectItem>
                <SelectItem value="month">Este mês</SelectItem>
                <SelectItem value="older">Antigas</SelectItem>
              </SelectContent>
            </Select>
            <div className="flex gap-1 flex-wrap">
              <TimePill label="Hoje" value="today" active={criteria.timeFilter} onChange={onTime} />
              <TimePill label="Semana" value="week" active={criteria.timeFilter} onChange={onTime} />
              <TimePill label="Mes" value="month" active={criteria.timeFilter} onChange={onTime} />
              <TimePill label="Antigas" value="older" active={criteria.timeFilter} onChange={onTime} />
            </div>
          </div>

          <div className="space-y-2">
            <Label>Ordenar por</Label>
            <Select value={criteria.sortBy} onValueChange={(v) => onSort(v as SortOrder)}>
              <SelectTrigger><SelectValue placeholder="Mais recente" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="date-desc">Mais recente</SelectItem>
                <SelectItem value="date-asc">Mais antiga</SelectItem>
                <SelectItem value="alpha">Alfabetica</SelectItem>
                <SelectItem value="words-desc">Mais palavras</SelectItem>
                <SelectItem value="fc-desc">Mais flashcards</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
        <DialogFooter className="sm:justify-between">
          <Button variant="ghost" size="sm" onClick={onClear} disabled={activeFilterCount === 0} className="text-xs">Limpar filtros</Button>
          <Button onClick={() => onOpenChange(false)} size="sm">Aplicar</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
