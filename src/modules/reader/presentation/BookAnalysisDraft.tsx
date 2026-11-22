import { useMemo, useState, type ReactElement } from "react";
import { Button } from "@/components/ui/button";
import { Link } from "@/components/link";
import type { BookAnalysis, BookIdea, BookConnection, BookStudyItem } from "../domain/book-analysis";
import { saveBookAnalysis } from "../infra/save-book-analysis";
import { GenerateBookArgumentMap } from "./GenerateBookArgumentMap";
import { bookIdeaLabel, bookConnectionLabel } from "../domain/book-argument-labels";
import { bookGraphContextLabel } from "../domain/book-page-selection";

type SaveState = "reviewing" | "saving" | "failed" | { id: string };

/** Lets the reader review evidence and choose what to publish as a new graph. */
export function BookAnalysisDraft({ book, id, sections, currentPage, onSaved }: {
  book: string; id: string; sections: string[]; currentPage: number; onSaved: () => void;
}): ReactElement {
  const [draft, setDraft] = useState<BookAnalysis | null>(null);
  return (
    <details className="shrink-0 rounded-md border p-2">
      <summary className="cursor-pointer text-sm font-medium">Gerar grafo para análise</summary>
      {draft ? <ReviewBookAnalysis book={book} id={id} draft={draft} onReset={() => setDraft(null)} onSaved={onSaved} />
        : <GenerateBookArgumentMap sections={sections} currentPage={currentPage} onDraft={setDraft} />}
    </details>
  );
}

function ReviewBookAnalysis({ book, id, draft, onReset, onSaved }: {
  book: string; id: string; draft: BookAnalysis; onReset: () => void; onSaved: () => void;
}): ReactElement {
  const [excluded, setExcluded] = useState<Set<string>>(() => new Set());
  const [state, setState] = useState<SaveState>("reviewing");
  const accepted = useMemo(() => ({
    scope: draft.scope,
    ideas: draft.ideas.filter(({ key }) => !excluded.has(key)),
    connections: draft.connections.filter(({ from, to }, index) =>
      !excluded.has(from) && !excluded.has(to) && !excluded.has(`edge:${index}`)),
    study: draft.study?.filter(({ key, concept }) => !excluded.has(key) && !excluded.has(concept)),
  }), [draft, excluded]);
  const titles = useMemo(() => new Map(draft.ideas.map(({ key, title }) => [key, title])), [draft]);
  const toggle = (key: string): void => setExcluded((current) => {
    const next = new Set(current);
    if (next.has(key)) next.delete(key);
    else next.add(key);
    return next;
  });
  const save = async (): Promise<void> => {
    setState("saving");
    try {
      setState(await saveBookAnalysis({ book, transcription: id }, accepted));
      onSaved();
    } catch {
      setState("failed");
    }
  };
  if (!draft.ideas.length) return (
    <div className="mt-2 space-y-2 text-sm">
      <p>Nenhuma sugestão com citação correspondente foi encontrada nesta transcrição.</p>
      <Button size="sm" variant="outline" onClick={onReset}>Voltar à análise</Button>
    </div>
  );
  if (typeof state === "object") {
    const pages = draft.scope?.pages;
    const scope = pages ? `?${new URLSearchParams({ pages })}` : "";
    return <Link className="mt-2 block text-sm underline" href={`/graph/${encodeURIComponent(state.id)}${scope}`}>Abrir grafo do livro</Link>;
  }
  return (
    <div className="mt-2 space-y-2 text-sm">
      <DraftStudySummary draft={draft} />
      {draft.scope && <p>{bookGraphContextLabel(draft.scope)}</p>}
      <fieldset className="max-h-[30vh] space-y-2 overflow-auto" disabled={state === "saving"}>
        <legend className="sr-only">Sugestões para o grafo</legend>
        {draft.ideas.map((idea) => (
          <label key={idea.key} className="flex gap-2">
            <input type="checkbox" checked={!excluded.has(idea.key)} onChange={() => toggle(idea.key)} />
            <IdeaEvidence idea={idea} />
          </label>
        ))}
        {draft.connections.map((edge, index) => (
          <label key={index} className="flex gap-2">
            <input type="checkbox" disabled={excluded.has(edge.from) || excluded.has(edge.to)}
              checked={!excluded.has(edge.from) && !excluded.has(edge.to) && !excluded.has(`edge:${index}`)}
              onChange={() => toggle(`edge:${index}`)} />
            <ConnectionEvidence edge={edge} from={titles.get(edge.from)} to={titles.get(edge.to)} />
          </label>
        ))}
        <StudySuggestions items={draft.study ?? []} excluded={excluded} onToggle={toggle} />
      </fieldset>
      {state === "failed" && <p role="alert">Não foi possível salvar o grafo no vault.</p>}
      <Button size="sm" disabled={!accepted.ideas.length || state === "saving"} onClick={() => void save()}>
        {state === "saving" ? "Atualizando grafo…" : "Salvar no grafo do livro"}
      </Button>
      <Button size="sm" variant="ghost" disabled={state === "saving"} onClick={onReset}>Refazer análise</Button>
    </div>
  );
}

function DraftStudySummary({ draft }: { draft: BookAnalysis }): ReactElement {
  const study = draft.study ?? [];
  const notes = study.filter(({ kind }) => kind === "note").length;
  return (
    <p role="status"><strong>Rascunho pronto para revisão.</strong> {draft.ideas.length} conceitos, {draft.connections.length} relações,
      {" "}{notes} notas e {study.length - notes} flashcards.</p>
  );
}

function StudySuggestions({ items, excluded, onToggle }: {
  items: BookStudyItem[]; excluded: Set<string>; onToggle: (key: string) => void;
}): ReactElement {
  return <>{items.map((item) => (
    <label key={item.key} className="flex gap-2">
      <input type="checkbox" disabled={excluded.has(item.concept)}
        checked={!excluded.has(item.concept) && !excluded.has(item.key)} onChange={() => onToggle(item.key)} />
      <span><strong>{item.kind === "note" ? "Nota" : "Flashcard"} · {item.title}</strong>
        <span className="block">{item.body}</span>
        <span className="block italic">{item.quote}</span>
      </span>
    </label>
  ))}</>;
}

function IdeaEvidence({ idea }: { idea: BookIdea }): ReactElement {
  return <span><strong>{bookIdeaLabel(idea)} · {idea.title}</strong>
    {idea.chapter && <span className="block text-muted-foreground">{idea.chapter}</span>}
    <span className="block">{idea.quote}</span>
  </span>;
}

function ConnectionEvidence({ edge, from, to }: { edge: BookConnection; from?: string; to?: string }): ReactElement {
  return <span><strong>{from} → {bookConnectionLabel(edge)} → {to}</strong>
    {edge.chapter && <span className="block text-muted-foreground">{edge.chapter}</span>}
    {edge.rationale && <span className="block">{edge.rationale}</span>}
    <span className="block italic">{edge.quote}</span>
  </span>;
}
