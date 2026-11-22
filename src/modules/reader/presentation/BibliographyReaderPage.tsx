import { useEffect, useMemo, useState, type ReactElement } from "react";
import { ArrowLeftIcon, BookOpenIcon, ChevronLeftIcon, ChevronRightIcon, ClipboardIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Link } from "@/components/link";
import { useSearchParams } from "@/lib/navigation";
import { useLocation } from "react-router-dom";
import { desktop, isDesktop } from "@/lib/vault-bridge";
import { toast } from "sonner";
import { formatReaderCitation, type ReaderPassage } from "../domain/reader-citation";
import { searchReaderPages } from "../application/search-reader-pages";
import type { LocalPdf } from "../infra/pdf-reader";
import { useLocalPdf } from "./use-local-pdf";
import { PdfPageView } from "./PdfPageView";
import { LibraryShelf, type LibraryFile } from "./LibraryShelf";
import { ReaderOcrPanel } from "./ReaderOcrPanel";
import { useReaderOcr } from "./use-reader-ocr";
import { AddLibraryBook } from "./AddLibraryBook";
import { BookTranscriptions } from "./BookTranscriptions";
import { BookReviewPanes } from "./BookReviewPanes";
import { ReaderPageAssistant } from "./ReaderPageAssistant";
import { readAssistantPage } from "../infra/read-assistant-page";

export default function BibliographyReaderPage(): ReactElement {
  return (
    <main className="mx-auto w-full max-w-[100rem] space-y-5 px-4 py-6 sm:px-6">
      <h1 className="flex items-center gap-2 text-2xl font-semibold"><BookOpenIcon className="size-6" /> Biblioteca</h1>
      {isDesktop() ? <LocalBibliography /> : <p>O leitor de arquivos do vault está disponível no app desktop.</p>}
    </main>
  );
}

function LocalBibliography(): ReactElement {
  const sourceBook = useSearchParams().get("book");
  const [files, setFiles] = useState<LibraryFile[]>();
  const [selected, setSelected] = useState<LibraryFile | null>(null);
  const [failed, setFailed] = useState(false);
  useEffect(() => {
    let active = true;
    void desktop.vault.listLibraryPdfs().then(
      (library) => {
        if (!active) return;
        setFiles(library);
        if (sourceBook) setSelected(library.find((file) => file.path === sourceBook) ?? null);
      },
      () => { if (active) setFailed(true); },
    );
    return (): void => { active = false; };
  }, [sourceBook]);
  const addToShelf = (file: LibraryFile): void => {
    setFailed(false);
    setFiles((current) => [...(current ?? []).filter(({ path }) => path !== file.path), file]
      .sort((left, right) => left.name.localeCompare(right.name, "pt-BR")));
  };
  return (
    <>
      {!selected && <AddLibraryBook onAdded={addToShelf} />}
      {failed && <p role="alert">Não foi possível abrir a bibliografia do vault.</p>}
      <MissingBibliographyBook source={sourceBook} files={files} />
      {!files && !failed && <p role="status">Carregando bibliografia…</p>}
      {files?.length === 0 && (
        <p>Nenhum PDF encontrado em <code>Resources/Bibliografia/Arquivos</code>. Confira o vault selecionado em <Link href="/settings" className="underline">Configurações</Link>.</p>
      )}
      {files && files.length > 0 && (
        <div hidden={Boolean(selected)}><LibraryShelf files={files} onOpen={setSelected} /></div>
      )}
      {selected && (
        <section className="space-y-4">
          <div className="flex flex-wrap items-center gap-3">
            <Button variant="ghost" onClick={() => setSelected(null)}><ArrowLeftIcon /> Voltar à biblioteca</Button>
            <h2 className="min-w-0 break-words font-semibold">{selected.name}</h2>
          </div>
          <OpenDocument key={selected.path} file={selected} />
        </section>
      )}
    </>
  );
}

function MissingBibliographyBook({ source, files }: { source: string | null; files: LibraryFile[] | undefined }): ReactElement | null {
  if (!source || !files || files.some(({ path }) => path === source)) return null;
  return <p role="alert">O livro citado não está neste vault.</p>;
}

function OpenDocument({ file }: { file: LibraryFile }): ReactElement {
  const { book, error } = useLocalPdf(file.path);
  const citation = useSearchParams();
  const { key } = useLocation();
  if (error) return <p role="alert">Não foi possível ler este PDF. Confira se o arquivo pode ser aberto e se está desbloqueado.</p>;
  if (!book) return <p role="status">Abrindo PDF…</p>;
  return <DocumentReader key={citation.has("transcription") ? key : file.path} book={book} name={file.name}
    relative={file.path} initialPage={Number(citation.get("page"))} />;
}

function DocumentReader({ book, name, relative, initialPage }: { book: LocalPdf; name: string; relative: string; initialPage: number }): ReactElement {
  const [page, setPage] = useState(() => Number.isInteger(initialPage) && initialPage >= 1 && initialPage <= book.pageCount ? initialPage : 1);
  const [scale, setScale] = useState(1);
  const [selection, setSelection] = useState("");
  const [sideBySide, setSideBySide] = useState(false);
  const ocr = useReaderOcr(book, relative);
  const source = useMemo(() => {
    const pages = new Map(ocr.cache?.pages.map((entry) => [entry.page, entry.text]));
    return {
      pageCount: book.pageCount,
      readPageText: async (number: number): Promise<string> => {
        const recognized = pages.get(number);
        const native = await book.readPageText(number).catch(() => "");
        return recognized ? `${native}\n${recognized}` : native;
      },
    };
  }, [book, ocr.cache]);
  const goTo = (next: number): void => {
    if (!Number.isInteger(next) || next < 1 || next > book.pageCount) return;
    setPage(next);
    setSelection("");
  };
  const pdf = <PdfPageView key={`${page}:${scale}`} book={book} page={page} scale={scale} fitWidth={sideBySide} onSelection={setSelection} />;
  return (
    <div className="space-y-3">
        <div className="flex flex-wrap items-center gap-2" aria-label="Navegação do livro">
          <Button variant="outline" size="icon-sm" aria-label="Página anterior" disabled={page <= 1} onClick={() => goTo(page - 1)}><ChevronLeftIcon /></Button>
          <form key={page} className="flex items-center gap-2" onSubmit={(event) => {
            event.preventDefault();
            goTo(Number(new FormData(event.currentTarget).get("page")));
          }}>
            <Input type="number" name="page" aria-label="Página do PDF" defaultValue={page} min={1} max={book.pageCount} className="w-20" />
            <Button variant="outline" type="submit" size="sm">Ir</Button>
            <span className="text-sm text-muted-foreground">de {book.pageCount}</span>
          </form>
          <Button variant="outline" size="icon-sm" aria-label="Próxima página" disabled={page >= book.pageCount} onClick={() => goTo(page + 1)}><ChevronRightIcon /></Button>
          <select aria-label="Zoom do PDF" className="rounded-md border bg-background p-1.5 text-sm" value={scale} onChange={(event) => {
            setScale(Number(event.target.value));
            setSelection("");
          }}>
            {[0.7, 1, 1.25, 1.5, 2].map((level) => <option key={level} value={level}>{Math.round(level * 100)}%</option>)}
          </select>
          <Button variant="outline" disabled={!selection} onClick={() => copyPassage(name, { page, excerpt: selection })}><ClipboardIcon /> Copiar citação</Button>
          <ReaderPageAssistant book={relative} page={page} pageCount={book.pageCount} selection={selection}
            readPage={() => readAssistantPage(relative, page, () => source.readPageText(page))} />
          <Button variant={sideBySide ? "default" : "outline"} aria-pressed={sideBySide} onClick={() => {
            setSideBySide(!sideBySide);
            setSelection("");
          }}>Leitura lado a lado</Button>
        </div>
      {sideBySide ? <BookReviewPanes book={relative} page={page} pdf={pdf} /> : (
        <div className="grid items-start gap-4 xl:grid-cols-[minmax(0,1fr)_22rem]">
          <section className="min-w-0 space-y-3">
            <ReaderOcrPanel
              key={page} book={book} page={page} relative={relative}
              result={ocr.cache?.pages.find((entry) => entry.page === page)}
              available={Boolean(ocr.cache)} pendingPage={ocr.pendingPage} failed={ocr.failed}
              runningBook={ocr.runningBook}
              onRecognizeBook={ocr.recognizeBook} onStop={ocr.stop}
              onRecognize={ocr.recognize} onCopy={(excerpt) => copyPassage(name, { page, excerpt })}
            />
            <BookTranscriptions book={relative} />
            {pdf}
          </section>
          <DocumentSearch book={source} name={name} onPage={goTo} />
        </div>
      )}
    </div>
  );
}

function copyPassage(name: string, passage: ReaderPassage): void {
  void navigator.clipboard.writeText(formatReaderCitation(name, passage)).then(
    () => toast.success("Citação copiada."),
    () => toast.error("Não foi possível copiar a citação."),
  );
}

type SearchableDocument = Pick<LocalPdf, "pageCount" | "readPageText">;

function DocumentSearch({ book, name, onPage }: { book: SearchableDocument; name: string; onPage: (page: number) => void }): ReactElement {
  const [phrase, setPhrase] = useState("");
  const [query, setQuery] = useState("");
  return (
    <aside className="space-y-3 rounded-lg border bg-card p-4">
      <h2 className="font-semibold">Buscar neste documento</h2>
      <form className="flex gap-2" onSubmit={(event) => { event.preventDefault(); setQuery(phrase.trim()); }}>
        <Input aria-label="Texto para buscar" value={phrase} onChange={(event) => setPhrase(event.target.value)} required />
        <Button type="submit">Buscar</Button>
      </form>
      {query && <SearchResults key={query} query={query} book={book} name={name} onPage={onPage} />}
    </aside>
  );
}

function SearchResults({ query, book, name, onPage }: { query: string; book: SearchableDocument; name: string; onPage: (page: number) => void }): ReactElement {
  const [matches, setMatches] = useState<ReaderPassage[]>();
  const [failed, setFailed] = useState(false);
  useEffect(() => {
    const execution = new AbortController();
    const { signal } = execution;
    void searchReaderPages(book, query, signal).then(
      (passages) => { if (!signal.aborted) setMatches(passages); },
      () => { if (!signal.aborted) setFailed(true); },
    );
    return (): void => execution.abort();
  }, [book, query]);
  if (failed) return <p role="alert">Não foi possível buscar neste documento.</p>;
  if (!matches) return <p role="status">Buscando nas páginas…</p>;
  if (matches.length === 0) return <p className="text-sm text-muted-foreground">Nenhum trecho encontrado.</p>;
  return (
    <ul className="max-h-[34rem] space-y-3 overflow-auto">
      {matches.map((passage) => (
        <li key={passage.page} className="space-y-1 border-b pb-2 text-sm last:border-0">
          <Button size="sm" variant="ghost" onClick={() => onPage(passage.page)}>Página {passage.page}</Button>
          <p>{passage.excerpt}</p>
          <Button size="sm" variant="ghost" onClick={() => copyPassage(name, passage)}><ClipboardIcon /> Copiar trecho</Button>
        </li>
      ))}
    </ul>
  );
}
