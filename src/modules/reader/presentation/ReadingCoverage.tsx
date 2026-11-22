import { useEffect, useState, type ReactElement } from "react";
import { bookAssistantCoverage } from "../infra/book-assistant-context";

function pageRanges(pages: number[]): string {
  return pages.map((page, index) => {
    const starts = pages[index - 1] !== page - 1;
    const ends = pages[index + 1] !== page + 1;
    if (starts) return `${index ? ", " : ""}${page}`;
    return ends ? `–${page}` : "";
  }).join("");
}

/** Shows what is already in the book graph and what remains to analyze. */
export function ReadingCoverage({ book, total }: { book: string; total: number }): ReactElement {
  const [pages, setPages] = useState<number[] | "failed">();
  useEffect(() => {
    let active = true;
    void bookAssistantCoverage(book).then(
      (coverage) => { if (active) setPages(coverage); },
      () => { if (active) setPages("failed"); },
    );
    return (): void => { active = false; };
  }, [book]);
  if (pages === "failed") return <p role="status" className="text-sm">Não foi possível consultar a cobertura do grafo.</p>;
  if (!pages) return <p role="status" className="text-sm">Consultando a cobertura do grafo…</p>;
  const analyzed = [...new Set(pages)].filter((page) => page <= total).sort((left, right) => left - right);
  const covered = new Set(analyzed);
  const missing = Array.from({ length: total }, (_, index) => index + 1).filter((page) => !covered.has(page));
  return (
    <details className="rounded-md border p-2 text-sm">
      <summary className="cursor-pointer">Cobertura do grafo · {analyzed.length} de {total} páginas analisadas</summary>
      <div className="max-h-32 space-y-1 overflow-auto py-1">
        <p><strong>Analisadas:</strong> {pageRanges(analyzed) || "Nenhuma"}</p>
        <p><strong>Ainda sem análise:</strong> {pageRanges(missing) || "Nenhuma"}</p>
      </div>
    </details>
  );
}
