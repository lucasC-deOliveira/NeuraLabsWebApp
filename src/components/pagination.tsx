"use client";

import { ChevronLeftIcon, ChevronRightIcon } from "lucide-react";
import { Button } from "@/components/ui/button";

interface PaginationProps {
  page: number;
  totalPages: number;
  onPage: (page: number) => void;
}

// Controle de página compartilhado (flashcards, baralhos): nada específico de um
// domínio, só "Página X de Y" + navegação.
// Só aparece quando há mais de uma página (lista pequena não precisa de controle).
export function Pagination({ page, totalPages, onPage }: PaginationProps) {
  if (totalPages <= 1) return null;

  return (
    <div className="mt-2 flex items-center justify-between gap-3">
      <p className="text-xs text-muted-foreground">
        Página {page} de {totalPages}
      </p>
      <div className="flex gap-2">
        <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => onPage(page - 1)}>
          <ChevronLeftIcon className="mr-1 size-4" />
          Anterior
        </Button>
        <Button variant="outline" size="sm" disabled={page >= totalPages} onClick={() => onPage(page + 1)}>
          Próxima
          <ChevronRightIcon className="ml-1 size-4" />
        </Button>
      </div>
    </div>
  );
}
