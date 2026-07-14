"use client";

import { ChevronLeftIcon, ChevronRightIcon } from "lucide-react";
import { Button } from "@/components/ui/button";

interface GraphListPaginationProps {
  page: number;
  pageSize: number;
  total: number;
  onPage: (page: number) => void;
}

export function GraphListPagination({ page, pageSize, total, onPage }: GraphListPaginationProps) {
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  if (total === 0) return null;

  return (
    <div className="mt-6 flex items-center justify-between gap-3">
      <p className="text-xs text-muted-foreground">
        Página {page} de {totalPages} · {total} grafo{total === 1 ? "" : "s"}
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
