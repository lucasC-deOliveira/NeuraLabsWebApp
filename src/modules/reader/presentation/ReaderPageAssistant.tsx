import { useEffect, useState, type FormEvent, type ReactElement } from "react";
import type { ReaderExplanation, ReaderExplanationMode, ReaderExplanationReference, SavedReaderExplanation } from "@contracts/reader-explanation";
import type { VaultChatRequest } from "@contracts/vault-chat";
import { Button } from "@/components/ui/button";
import { Link } from "@/components/link";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { MarkdownContent } from "@/components/markdown-content";
import { desktop } from "@/lib/vault-bridge";
import { explainBookPage } from "../application/explain-book-page";
import { askReaderExplanation } from "../infra/reader-explanation-proxy";
import { findBookAssistantEvidence } from "../infra/book-assistant-context";
import { synthesizeBookIdea } from "../application/synthesize-book-idea";
import { ReadingCoverage } from "./ReadingCoverage";

interface ReaderPageContext {
  book: string;
  page: number;
  pageCount: number;
  selection: string;
  readPage: () => Promise<string>;
}

type AnswerState = "idle" | "searching" | "asking" | "no-text" | "no-evidence" | "failed" | ReaderExplanation;
type QuestionScope = "page" | "book";

/** Opens the reading assistant with the currently visible page. */
export function ReaderPageAssistant(context: ReaderPageContext): ReactElement {
  const [open, setOpen] = useState(false);
  return (
    <>
      <Button variant="outline" onClick={() => setOpen(true)}>Perguntar à IA</Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-h-[88vh] overflow-y-auto sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>Assistente de leitura · Página {context.page}</DialogTitle>
            <DialogDescription>O texto usado na resposta será enviado ao provedor de IA configurado.</DialogDescription>
          </DialogHeader>
          {open && <PageAssistantConversation key={context.page} {...context} />}
        </DialogContent>
      </Dialog>
    </>
  );
}

function PageAssistantConversation({ book, page, pageCount, selection, readPage }: ReaderPageContext): ReactElement {
  const [mode, setMode] = useState<ReaderExplanationMode>("explain");
  const [scope, setScope] = useState<QuestionScope>("page");
  const [question, setQuestion] = useState("");
  const [history, setHistory] = useState<VaultChatRequest["history"]>([]);
  const [state, setState] = useState<AnswerState>("idle");
  const [revision, setRevision] = useState(0);
  const busy = state === "asking" || state === "searching";
  const ask = async (event: FormEvent<HTMLFormElement>): Promise<void> => {
    event.preventDefault();
    if (busy) return;
    const request = { book, page, mode, question, selection, history, readPage };
    try {
      const result = await askReaderScope(scope, request, setState);
      if (typeof result === "string") { setState(result); return; }
      const exchange: VaultChatRequest["history"] = [
        { role: "user", content: question.trim() || mode },
        { role: "assistant", content: result.answer.slice(0, 4000) },
      ];
      setHistory((previous) => [...previous, ...exchange].slice(-6));
      setState(result);
    } catch {
      setState("failed");
    }
  };
  return (
    <div className="space-y-4">
      <ReadingCoverage book={book} total={pageCount} />
      <form className="space-y-2" onSubmit={(event) => void ask(event)}>
        <label className="flex items-center gap-2 text-sm">
          Contexto
          <select className="rounded-md border bg-background p-2" value={scope} disabled={busy} onChange={(event) => {
            setScope(event.target.value as QuestionScope);
            setHistory([]);
          }}>
            <option value="page">Página atual</option>
            <option value="book">Livro inteiro</option>
          </select>
        </label>
        <label className="flex items-center gap-2 text-sm">
          Pedido
          <select className="rounded-md border bg-background p-2" value={mode}
            onChange={(event) => setMode(event.target.value as ReaderExplanationMode)} disabled={busy}>
            <option value="explain">Explicar</option>
            <option value="simplify">Simplificar</option>
            <option value="analogy">Criar analogia</option>
            <option value="summary">Resumir</option>
          </select>
        </label>
        {selection && <blockquote className="line-clamp-3 border-l pl-2 text-sm">{selection}</blockquote>}
        <textarea aria-label="Dúvida sobre esta página" className="w-full rounded-md border bg-background p-2 text-sm"
          rows={3} maxLength={1200} value={question} placeholder="Qual parte você quer entender? (opcional)"
          onChange={(event) => setQuestion(event.target.value)} disabled={busy} />
        <Button type="submit" disabled={busy || (scope === "book" && !question.trim() && !selection.trim())}>{busy ? "Consultando…" : "Enviar pedido"}</Button>
      </form>
      <AssistantAnswerFeedback state={state} />
      {typeof state === "object" && <ApproveExplanation key={state.id} book={book} page={page}
        explanation={state} onSaved={() => setRevision((value) => value + 1)} onDiscarded={() => {
          setHistory((previous) => previous.slice(0, -2));
        }} />}
      <SavedPageExplanations book={book} page={page} revision={revision} />
    </div>
  );
}

type ScopedQuestion = Pick<ReaderPageContext, "book" | "page" | "selection" | "readPage"> & {
  mode: ReaderExplanationMode; question: string; history: VaultChatRequest["history"];
};

async function askReaderScope(scope: QuestionScope, input: ScopedQuestion, feedback: (state: AnswerState) => void): Promise<
  ReaderExplanation | "no-text" | "no-evidence"
> {
  const { book, mode, question, selection, readPage } = input;
  const draft = { id: crypto.randomUUID(), mode, question };
  if (scope === "page") {
    feedback("asking");
    const answer = await explainBookPage({ ...input, pageText: await readPage() }, askReaderExplanation);
    return answer ? { ...draft, answer } : "no-text";
  }
  feedback("searching");
  const topic = (question.trim() || selection.trim()).slice(0, 1200);
  const references = await findBookAssistantEvidence(book, topic);
  feedback("asking");
  const synthesis = await synthesizeBookIdea({ ...input, question: topic, references }, askReaderExplanation);
  return synthesis ? { ...draft, question: topic, ...synthesis, scope: "book" } : "no-evidence";
}

function AssistantAnswerFeedback({ state }: { state: AnswerState }): ReactElement | null {
  if (state === "searching") return <p role="status">Buscando passagens na transcrição. A primeira consulta pode levar mais tempo.</p>;
  if (state === "asking") return <p role="status">O provedor está preparando a resposta com as fontes selecionadas.</p>;
  if (state === "no-evidence") return <p role="alert">Nenhuma passagem encontrada. Confira se o livro tem uma transcrição paginada.</p>;
  if (state === "no-text") return <p role="alert">Esta página precisa de texto reconhecido. Use a transcrição ou o OCR do leitor.</p>;
  if (state === "failed") return <p role="alert">Não foi possível obter a resposta. Confira a conexão e o provedor de IA.</p>;
  return null;
}

function ApproveExplanation({ book, page, explanation, onSaved, onDiscarded }: {
  book: string; page: number; explanation: ReaderExplanation; onSaved: () => void; onDiscarded: () => void;
}): ReactElement {
  const [status, setStatus] = useState<"draft" | "saving" | "saved" | "failed" | "discarded">("draft");
  const save = async (): Promise<void> => {
    setStatus("saving");
    try {
      await desktop.vault.saveReaderExplanation(book, page, explanation);
      setStatus("saved");
      onSaved();
    } catch {
      setStatus("failed");
    }
  };
  if (status === "discarded") return <p role="status">Rascunho descartado.</p>;
  return (
    <section className="space-y-2 rounded-md border p-3">
      <h3 className="font-medium">Resposta da IA</h3>
      <MarkdownContent>{explanation.answer}</MarkdownContent>
      {explanation.scope === "book" && <BookAnswerReferences book={book} references={explanation.references ?? []} />}
      {status === "saved" ? <p role="status">Resposta salva no vault.</p> : (
        <div className="flex flex-wrap gap-2">
          <Button size="sm" disabled={status === "saving"} onClick={() => void save()}>Salvar resposta no vault</Button>
          <Button size="sm" variant="ghost" disabled={status === "saving"} onClick={() => {
            setStatus("discarded");
            onDiscarded();
          }}>Descartar</Button>
        </div>
      )}
      {status === "failed" && <p role="alert">Não foi possível salvar a resposta no vault.</p>}
    </section>
  );
}

function SavedPageExplanations({ book, page, revision }: { book: string; page: number; revision: number }): ReactElement {
  const [saved, setSaved] = useState<SavedReaderExplanation[] | "failed">([]);
  useEffect(() => {
    let active = true;
    void desktop.vault.listReaderExplanations(book, page).then(
      (notes) => { if (active) setSaved(notes); },
      () => { if (active) setSaved("failed"); },
    );
    return (): void => { active = false; };
  }, [book, page, revision]);
  if (saved === "failed") return <p role="alert">Não foi possível abrir as respostas salvas.</p>;
  const pageNotes = saved.filter(({ scope }) => scope !== "book");
  const bookNotes = saved.filter(({ scope }) => scope === "book");
  return (
    <div className="space-y-2">
      <details className="rounded-md border p-3">
        <summary className="cursor-pointer font-medium">Respostas salvas nesta página ({pageNotes.length})</summary>
        {pageNotes.map((note) => <SavedExplanationNote key={note.id} book={book} page={page} note={note} />)}
      </details>
      <details className="rounded-md border p-3">
        <summary className="cursor-pointer font-medium">Sínteses salvas do livro ({bookNotes.length})</summary>
        {bookNotes.map((note) => <SavedExplanationNote key={note.id} book={book} page={page} note={note} />)}
      </details>
    </div>
  );
}

function SavedExplanationNote({ book, page, note }: { book: string; page: number; note: SavedReaderExplanation }): ReactElement {
  const source = note.source;
  const href = source ? `/biblioteca?${new URLSearchParams({
    book, page: String(page), transcription: source.transcription, section: String(source.section),
  })}` : null;
  const markdown = note.markdown.split(/^<!-- neuralabs-book-references /mu, 1)[0]
    .replace(/^(# [^\n]+\r?\n\r?\n)\[(?:PDF original|Transcrição · Página \d+)\]\(<[^\n]+>\)\r?\n/u, "$1");
  return (
    <div className="mt-3 space-y-1 border-t pt-2">
      {href && <Link href={href} className="text-sm underline">Abrir página na transcrição</Link>}
      <MarkdownContent>{markdown}</MarkdownContent>
      {note.scope === "book" && <BookAnswerReferences book={book} references={note.references ?? []} />}
    </div>
  );
}

function BookAnswerReferences({ book, references }: { book: string; references: ReaderExplanationReference[] }): ReactElement {
  if (!references.length) return <p className="text-sm text-muted-foreground">A resposta veio sem citações verificáveis.</p>;
  return (
    <details className="rounded-md border p-2 text-sm" open>
      <summary className="cursor-pointer font-medium">Fontes citadas ({references.length})</summary>
      <ul className="mt-2 space-y-2">
        {references.map(({ page, chapter, transcription, section, quote }) => (
          <li key={section} className="border-l pl-2">
            <Link className="underline" href={`/biblioteca?${new URLSearchParams({
              book, page: String(page), transcription, section: String(section), quote,
            })}`}>Página {page}{chapter ? ` · ${chapter}` : ""}</Link>
            <p className="line-clamp-2 text-muted-foreground">{quote}</p>
          </li>
        ))}
      </ul>
    </details>
  );
}
