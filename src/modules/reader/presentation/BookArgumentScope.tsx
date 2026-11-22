import { useId, useState, type ReactElement } from "react";
import { Button } from "@/components/ui/button";
import { bookGraphContextLabel, isPaginatedBook, selectBookPages } from "../domain/book-page-selection";

export interface BookArgumentSelection {
  sections: readonly string[];
  pages: string | null;
  complete: boolean;
}

/** Lets readers scope either analysis mode to the same reading context. */
export function BookArgumentScope({ sections, currentPage, busy, onRun }: {
  sections: string[]; currentPage: number; busy: boolean;
  onRun: (source: BookArgumentSelection, simple: boolean) => void;
}): ReactElement {
  const paginated = isPaginatedBook(sections);
  const [mode, setMode] = useState<"pages" | "book">(paginated ? "pages" : "book");
  const [editedPages, setPages] = useState<string | null>(null);
  const pages = editedPages ?? String(currentPage);
  const modeName = useId();
  const selected = mode === "pages" ? selectBookPages(sections, pages) : { sections, pages: null };
  const selection = selected ? { ...selected, complete: paginated && mode === "book" } : null;
  const run = (simple: boolean): void => { if (selection) onRun(selection, simple); };
  return (
    <fieldset disabled={busy} className="space-y-2">
      <legend className="font-medium">Recorte da análise</legend>
      {paginated && <div className="space-y-2">
        <label className="flex items-center gap-2">
          <input type="radio" name={modeName} checked={mode === "pages"} onChange={() => setMode("pages")} /> Páginas escolhidas
        </label>
        {mode === "pages" && <label className="block space-y-1">
          <span>Páginas de 1 a {sections.length}</span>
          <input className="block w-full rounded-md border bg-background p-2" value={pages}
            placeholder="Ex.: 2, 5–8" onChange={(event) => setPages(event.target.value)} />
          {!selection && <span role="alert">Informe páginas ou intervalos válidos, como 2, 5–8.</span>}
        </label>}
        <label className="flex items-center gap-2">
          <input type="radio" name={modeName} checked={mode === "book"} onChange={() => setMode("book")} /> Livro inteiro
        </label>
      </div>}
      {!paginated && <p>Esta transcrição está em blocos. Gere uma nova transcrição por página para escolher um recorte.</p>}
      {selection && <p className="text-muted-foreground">{bookGraphContextLabel(selection)}</p>}
      <div className="flex flex-wrap gap-2">
        <Button size="sm" disabled={!selection} onClick={() => run(false)}>Analisar com IA</Button>
        <Button size="sm" variant="outline" disabled={!selection} onClick={() => run(true)}>Usar análise simples</Button>
      </div>
    </fieldset>
  );
}
