"use client";

import { PlusIcon } from "lucide-react";

interface NewBaralhoCardProps {
  onClick: () => void;
}

// Primeiro cartão do grid, no lugar de um baralho — no disrupt criar é um cartão a
// mais na estante, não um botão à parte.
export function NewBaralhoCard({ onClick }: NewBaralhoCardProps) {
  return (
    <button type="button" onClick={onClick} className="group text-left" title="Criar um novo baralho">
      <div className="h-full rounded-lg border-2 border-dashed border-primary/20 pr-1 pb-1">
        <div className="h-full rounded-lg border-2 border-dashed border-primary/40 pr-1 pb-1">
          <div className="flex h-full flex-col items-center justify-center gap-4 rounded-lg border-2 border-dashed border-primary/60 bg-card p-8 transition-colors group-hover:border-primary group-hover:bg-primary/5">
            <PlusIcon className="size-16 text-primary/40 transition-transform group-hover:scale-110" />
            <h3 className="text-center text-lg font-bold text-primary">Novo baralho</h3>
          </div>
        </div>
      </div>
    </button>
  );
}
