"use client";

import { ChartCard } from "./chart-shell";
import { Pagination } from "./Pagination";
import { usePagination } from "../usePagination";
import type { ProblemCard } from "../../domain/analytics.types";

const PAGE_SIZE = 8;

// Cartões-problema (leeches): os que você mais erra. Ataque estes primeiro.
export function ProblemCardsList({ cards }: { cards: ProblemCard[] }) {
  const { page, pageIndex, pageCount, next, prev } = usePagination(cards, PAGE_SIZE);
  if (cards.length === 0) {
    return (
      <ChartCard title="Cartões-problema" hint="Os que você mais erra">
        <p className="py-10 text-center text-xs text-muted-foreground">
          Nenhum cartão problemático — você não errou nenhum ainda. 🎉
        </p>
      </ChartCard>
    );
  }
  return (
    <ChartCard title="Cartões-problema" hint="Os que você mais erra — ataque estes primeiro">
      <ul className="space-y-1.5">
        {page.map((card, i) => (
          <li key={i} className="flex items-center gap-3 rounded-md border px-3 py-2">
            <span className="min-w-0 flex-1 truncate text-sm">{card.pergunta}</span>
            <span className="shrink-0 text-xs tabular-nums text-muted-foreground">
              {card.wrong}/{card.total} erros
            </span>
            <span className="shrink-0 rounded-full bg-destructive/10 px-2 py-0.5 text-xs font-medium text-destructive tabular-nums">
              {card.accuracy}%
            </span>
          </li>
        ))}
      </ul>
      <Pagination pageIndex={pageIndex} pageCount={pageCount} onPrev={prev} onNext={next} />
    </ChartCard>
  );
}
