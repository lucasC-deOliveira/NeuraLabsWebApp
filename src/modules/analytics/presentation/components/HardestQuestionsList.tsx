"use client";

import { ChartCard } from "./chart-shell";
import { Pagination } from "./Pagination";
import { usePagination } from "../usePagination";
import type { HardQuestion } from "../../domain/prova-analytics.types";

const PAGE_SIZE = 8;

// Questões que você mais erra nas provas — ataque estas primeiro.
export function HardestQuestionsList({ questions }: { questions: HardQuestion[] }) {
  const { page, pageIndex, pageCount, next, prev } = usePagination(questions, PAGE_SIZE);
  if (questions.length === 0) {
    return (
      <ChartCard title="Questões mais erradas" hint="As que você mais erra">
        <p className="py-10 text-center text-xs text-muted-foreground">
          Nenhuma questão errada ainda — faça algumas provas para ver isto.
        </p>
      </ChartCard>
    );
  }
  return (
    <ChartCard title="Questões mais erradas" hint="As que você mais erra — revise estas">
      <ul className="space-y-1.5">
        {page.map((q, i) => (
          <li key={i} className="flex items-center gap-3 rounded-md border px-3 py-2">
            <span className="min-w-0 flex-1 truncate text-sm">{q.enunciado}</span>
            <span className="shrink-0 text-xs tabular-nums text-muted-foreground">
              {q.wrong}/{q.total} erros
            </span>
            <span className="shrink-0 rounded-full bg-destructive/10 px-2 py-0.5 text-xs font-medium text-destructive tabular-nums">
              {q.accuracy}%
            </span>
          </li>
        ))}
      </ul>
      <Pagination pageIndex={pageIndex} pageCount={pageCount} onPrev={prev} onNext={next} />
    </ChartCard>
  );
}
