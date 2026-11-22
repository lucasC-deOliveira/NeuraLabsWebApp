import { useState, type ReactElement } from "react";
import type { BookGraphIndex } from "@contracts/book-graph-source";
import { bookPageNumbers } from "@/lib/book-graph-view";
import { Button } from "@/components/ui/button";

/** Offers page-level and full-book views over the stored page evidence. */
export function BookGraphPageFilter({ index, current, onChange }: {
  index: BookGraphIndex; current: string; onChange: (selection: string) => void;
}): ReactElement {
  const [draft, setDraft] = useState(current);
  const pages = bookPageNumbers(draft, index.coverage.at(-1) ?? 0);
  const valid = !!pages?.length && pages.every((page) => index.coverage.includes(page));
  return (
    <form className="flex flex-wrap items-center gap-2 border-b px-3 py-2 text-sm"
      onSubmit={(event) => { event.preventDefault(); if (valid) onChange(draft.trim()); }}>
      <Button size="sm" type="button" variant={current ? "outline" : "default"}
        onClick={() => { setDraft(""); onChange(""); }}>Tudo que foi analisado</Button>
      <select aria-label="Abrir página analisada" className="rounded-md border bg-background p-1.5"
        value="" onChange={(event) => { setDraft(event.target.value); onChange(event.target.value); }}>
        <option value="" disabled>Páginas analisadas</option>
        {index.coverage.map((page) => <option key={page} value={page}>Página {page}</option>)}
      </select>
      <input aria-label="Páginas para filtrar" className="w-36 rounded-md border bg-background p-1.5"
        placeholder="Ex.: 2, 5–8" value={draft} onChange={(event) => setDraft(event.target.value)} />
      <Button size="sm" type="submit" disabled={!valid}>Filtrar páginas</Button>
      {current && <span role="status">Exibindo páginas {current}</span>}
      <span className="text-muted-foreground" title={index.coverage.join(", ")}>{index.coverage.length} páginas analisadas</span>
      {draft.trim() && !valid && <span role="status">Escolha apenas páginas já analisadas.</span>}
    </form>
  );
}
