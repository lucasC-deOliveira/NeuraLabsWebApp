"use client";

import { useMemo, useState } from "react";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { SearchIcon, Loader2Icon, CheckIcon } from "lucide-react";
import { LoadingState } from "@/components/loading-state";
import type { BaralhoCardOption } from "../../domain/baralho.types";
import { filterCardOptions } from "../../domain/services/filter-card-options";

interface AddCardsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  options: BaralhoCardOption[];
  loading: boolean;
  submitting: boolean;
  onAdd: (flashcardIds: string[]) => void;
}

export function AddCardsDialog({
  open, onOpenChange, options, loading, submitting, onAdd,
}: AddCardsDialogProps) {
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<string[]>([]);
  const visible = useMemo(() => filterCardOptions(options, search), [options, search]);

  const toggle = (id: string): void => {
    setSelected((prev) => (prev.includes(id) ? prev.filter((s) => s !== id) : [...prev, id]));
  };
  const submit = (): void => {
    onAdd(selected);
    setSelected([]);
    setSearch("");
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Adicionar cartões</DialogTitle>
          <DialogDescription>
            Escolha flashcards existentes para incluir neste baralho.
          </DialogDescription>
        </DialogHeader>

        <div className="relative">
          <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
          <Input
            placeholder="Buscar por pergunta ou conceito..."
            className="pl-9"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        <div className="max-h-72 overflow-y-auto space-y-1 -mx-1 px-1">
          {loading ? (
            <LoadingState message="Carregando flashcards…" />
          ) : visible.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-10">
              Nenhum flashcard disponivel para adicionar.
            </p>
          ) : (
            visible.map((option) => {
              const isSelected = selected.includes(option.id);
              return (
                <button
                  key={option.id}
                  type="button"
                  onClick={() => toggle(option.id)}
                  className={`w-full text-left rounded-md border p-2 transition-colors ${
                    isSelected ? "border-primary bg-primary/5" : "hover:bg-muted/50"
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <span className="text-xs leading-snug line-clamp-2">{option.pergunta}</span>
                    {isSelected && <CheckIcon className="size-3.5 shrink-0 text-primary" />}
                  </div>
                  {option.conceito && (
                    <Badge variant="secondary" className="mt-1 text-[10px] font-normal">
                      {option.conceito}
                    </Badge>
                  )}
                </button>
              );
            })
          )}
        </div>

        <DialogFooter className="gap-2">
          <Button variant="ghost" onClick={() => onOpenChange(false)}>Cancelar</Button>
          <Button disabled={selected.length === 0 || submitting} onClick={submit}>
            {submitting && <Loader2Icon className="size-3.5 mr-1 animate-spin" />}
            Adicionar {selected.length > 0 && `(${selected.length})`}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
