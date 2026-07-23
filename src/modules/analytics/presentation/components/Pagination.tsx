"use client";

import { ChevronLeftIcon, ChevronRightIcon } from "lucide-react";

interface PaginationProps {
  pageIndex: number;
  pageCount: number;
  onPrev: () => void;
  onNext: () => void;
}

// Controle de paginação enxuto para listas de analytics. Some quando há só uma
// página — não polui uma lista curta com navegação inútil.
export function Pagination({ pageIndex, pageCount, onPrev, onNext }: PaginationProps) {
  if (pageCount <= 1) return null;
  return (
    <div className="mt-2 flex items-center justify-between text-xs text-muted-foreground">
      <NavButton label="Anterior" icon={<ChevronLeftIcon className="size-3.5" />} onClick={onPrev} disabled={pageIndex === 0} />
      <span className="tabular-nums">
        Página {pageIndex + 1} de {pageCount}
      </span>
      <NavButton label="Próxima" icon={<ChevronRightIcon className="size-3.5" />} onClick={onNext} disabled={pageIndex >= pageCount - 1} iconAfter />
    </div>
  );
}

function NavButton({ label, icon, onClick, disabled, iconAfter }: {
  label: string;
  icon: React.ReactNode;
  onClick: () => void;
  disabled: boolean;
  iconAfter?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className="inline-flex items-center gap-1 rounded-md border px-2 py-1 transition-colors hover:bg-accent disabled:pointer-events-none disabled:opacity-40"
    >
      {!iconAfter && icon}
      {label}
      {iconAfter && icon}
    </button>
  );
}
