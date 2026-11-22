import { useState, type FormEvent, type ReactElement } from "react";
import type { ReaderSemanticHit } from "@contracts/reader-transcriptions";
import { Button } from "@/components/ui/button";
import { desktop } from "@/lib/vault-bridge";
import { PassageGraphConcepts } from "./PassageGraphConcepts";
import { getReaderGraph } from "@/lib/reader-graph-context";

type ReaderSearchState = "idle" | "searching" | "unavailable" | ReaderSemanticHit[];

/** Searches for related passages in the open transcription. */
export function ReaderSemanticSearch({ book, id, onSection }: {
  book: string; id: string; onSection: (section: number) => void;
}): ReactElement {
  const [query, setQuery] = useState("");
  const [state, setState] = useState<ReaderSearchState>("idle");
  const [open, setOpen] = useState(false);
  const submit = async (event: FormEvent<HTMLFormElement>): Promise<void> => {
    event.preventDefault();
    if (!query.trim() || state === "searching") return;
    setState("searching");
    try {
      setState(await desktop.vault.searchReaderTranscription(book, id, query));
    } catch {
      setState("unavailable");
    }
  };
  return (
    <details className="shrink-0 rounded-md border p-2" open={open} onToggle={(event) => setOpen(event.currentTarget.open)}>
      <summary className="cursor-pointer text-sm font-medium">Buscar por significado</summary>
      <form className="mt-2 flex gap-2" onSubmit={(event) => void submit(event)}>
        <input aria-label="Ideia para buscar no livro" className="min-w-0 flex-1 rounded-md border bg-background px-2 text-sm"
          placeholder="Descreva uma ideia em português ou inglês" value={query} maxLength={240}
          onChange={(event) => setQuery(event.target.value)} disabled={state === "searching"} />
        <Button size="sm" type="submit" disabled={!query.trim() || state === "searching"}>Buscar</Button>
      </form>
      {state === "searching" && <p role="status" className="mt-2 text-sm">Analisando a transcrição localmente. A primeira busca pode demorar.</p>}
      {state === "unavailable" && <p role="alert" className="mt-2 text-sm">Busca semântica indisponível. Verifique se o conversor local está em execução e tente novamente.</p>}
      {Array.isArray(state) && <SemanticHits hits={state} onSection={(section) => { onSection(section); setOpen(false); }} />}
    </details>
  );
}

function SemanticHits({ hits, onSection }: {
  hits: ReaderSemanticHit[]; onSection: (section: number) => void;
}): ReactElement {
  if (!hits.length) return <p role="status" className="mt-2 text-sm">Esta transcrição não tem trechos de texto para buscar.</p>;
  return (
    <>
    {!getReaderGraph() && <p className="mt-2 text-sm text-muted-foreground">Abra um grafo para ver os conceitos citados nos trechos.</p>}
    <ul aria-label="Trechos encontrados" className="mt-2 max-h-[25vh] space-y-1 overflow-auto">
      {hits.map((hit, index) => (
        <li key={index}>
          <button type="button" className="w-full rounded-md p-2 text-left text-sm hover:bg-muted" onClick={() => onSection(hit.section)}>
            <strong className="block">{hit.label ?? `Seção ${hit.section + 1}`}</strong>
            <span className="line-clamp-3">{hit.text}</span>
          </button>
          <PassageGraphConcepts passage={hit.text} />
        </li>
      ))}
    </ul>
    </>
  );
}
