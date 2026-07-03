"use client";

import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { FilterIcon, ArrowUpDownIcon, XIcon } from "lucide-react";
import type { AssuntoOption } from "../../domain/flashcard.types";
import type { FlashcardCriteria, StatusFilter, FlashcardSort } from "../../domain/services/flashcard-filters";

interface FlashcardsFilterDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  criteria: FlashcardCriteria;
  filterData: AssuntoOption[];
  availableTopicos: Array<{ id: string; nome: string }>;
  activeFilterCount: number;
  onAssunto: (v: string) => void;
  onTopico: (v: string) => void;
  onStatus: (v: StatusFilter) => void;
  onSort: (v: FlashcardSort) => void;
  onClear: () => void;
}

export function FlashcardsFilterDialog({
  open, onOpenChange, criteria, filterData, availableTopicos, activeFilterCount,
  onAssunto, onTopico, onStatus, onSort, onClear,
}: FlashcardsFilterDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <Button variant="outline" className="relative sm:w-[160px]" onClick={() => onOpenChange(true)}>
        <FilterIcon className="size-4 mr-1.5" />
        Filtros
        {activeFilterCount > 0 && (
          <span className="absolute -top-1 -right-1 size-4 bg-primary text-[9px] text-primary-foreground rounded-full flex items-center justify-center">{activeFilterCount}</span>
        )}
      </Button>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Filtros</DialogTitle>
          <DialogDescription>Refine a lista de flashcards criteriosamente.</DialogDescription>
        </DialogHeader>
        <div className="space-y-5 mt-2">
          <div className="space-y-2">
            <Label>Materia</Label>
            <Select value={criteria.assuntoFilter} onValueChange={(v) => onAssunto(v ?? "")}>
              <SelectTrigger><SelectValue placeholder="Todas materias" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="">Todas</SelectItem>
                {filterData.map((a) => (<SelectItem key={a.id} value={a.id}>{a.nome}</SelectItem>))}
              </SelectContent>
            </Select>
          </div>

          {criteria.assuntoFilter && availableTopicos.length > 0 && (
            <div className="space-y-2">
              <Label>Topico</Label>
              <Select value={criteria.topicoFilter} onValueChange={(v) => onTopico(v ?? "")}>
                <SelectTrigger><SelectValue placeholder="Todos os topicos" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="">Todos</SelectItem>
                  {availableTopicos.map((t) => (<SelectItem key={t.id} value={t.id}>{t.nome}</SelectItem>))}
                </SelectContent>
              </Select>
            </div>
          )}

          <div className="space-y-2">
            <Label>Status</Label>
            <Select value={criteria.statusFilter} onValueChange={(v) => onStatus(v as StatusFilter)}>
              <SelectTrigger><SelectValue placeholder="Todos os status" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos</SelectItem>
                <SelectItem value="overdue">Atrasados</SelectItem>
                <SelectItem value="due">Para hoje</SelectItem>
                <SelectItem value="not-due">Em dia</SelectItem>
                <SelectItem value="new">Novos / Iniciando</SelectItem>
                <SelectItem value="mastered">Dominados</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label className="flex items-center gap-1.5"><ArrowUpDownIcon className="size-3.5" />Ordenar por</Label>
            <Select value={criteria.sortBy} onValueChange={(v) => onSort(v as FlashcardSort)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="date">Mais recentes</SelectItem>
                <SelectItem value="difficulty">Dificuldade crescente</SelectItem>
                <SelectItem value="interval">Intervalo crescente</SelectItem>
                <SelectItem value="alpha">Alfabetica (conceito)</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
        <DialogFooter className="gap-2">
          <Button variant="ghost" size="sm" onClick={() => { onClear(); onOpenChange(false); }}>
            <XIcon className="size-3.5 mr-1" />Limpar tudo
          </Button>
          <Button onClick={() => onOpenChange(false)}>Aplicar filtros</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
