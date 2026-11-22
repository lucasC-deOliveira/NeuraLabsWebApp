import { useEffect, useRef, useState, type ReactElement } from "react";
import { FileTextIcon, Trash2Icon } from "lucide-react";
import { toast } from "sonner";
import type { ReaderTranscription } from "@contracts/reader-transcriptions";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { MarkdownContent } from "@/components/markdown-content";
import { desktop } from "@/lib/vault-bridge";
import { ConvertReaderMarkdown } from "./ConvertReaderMarkdown";
import { ReaderSemanticSearch } from "./ReaderSemanticSearch";
import { BookAnalysisDraft } from "./BookAnalysisDraft";
import { findBookCitation } from "../domain/find-book-citation";
import { SavedBookGraphs } from "./SavedBookGraphs";
import { useSearchParams } from "@/lib/navigation";

type TranscriptionsState = ReaderTranscription[] | "loading" | "failed";

/** Opens the Markdown exports associated with the PDF currently being read. */
export function BookTranscriptions({ book }: { book: string }): ReactElement {
  const [items, setItems] = useState<TranscriptionsState>("loading");
  const [revision, setRevision] = useState(0);
  const citation = useSearchParams();
  const linkedId = citation.get("book") === book ? citation.get("transcription") : null;
  const [selectedId, setSelectedId] = useState<string | null>(linkedId);
  const selected = Array.isArray(items) ? items.find((item) => item.id === selectedId) ?? null : null;
  const [removing, setRemoving] = useState<ReaderTranscription | null>(null);
  const refresh = (): void => setRevision((current) => current + 1);
  useEffect(() => {
    let active = true;
    void desktop.vault.listReaderTranscriptions(book).then(
      (matches) => { if (active) setItems(matches); },
      () => { if (active) setItems("failed"); },
    );
    return (): void => { active = false; };
  }, [book, revision]);

  return (
    <section className="space-y-2 rounded-lg border bg-card p-3">
      <h3 className="text-sm font-semibold">Transcrições</h3>
      <TranscriptionList items={items} onSelect={(item) => setSelectedId(item.id)} onRemove={setRemoving} />
      <MissingLinkedTranscription id={selectedId === linkedId ? linkedId : null} items={items} />
      {Array.isArray(items) && !items.some((item) => item.wholeBook) && <ConvertReaderMarkdown relative={book} onConverted={refresh} />}
      {removing && <RemoveTranscription book={book} item={removing} onClose={() => setRemoving(null)} onRemoved={refresh} />}
      <SavedBookGraphs book={book} revision={revision} />
      <Dialog open={selected !== null} onOpenChange={(open) => { if (!open) setSelectedId(null); }}>
        <DialogContent className="flex max-h-[90vh] max-w-[calc(100%-2rem)] flex-col gap-3 sm:max-w-4xl">
          <DialogHeader><DialogTitle>{selected ? transcriptionLabel(selected) : "Transcrição"}</DialogTitle></DialogHeader>
          {selected && <TranscriptionDocument key={selected.id} book={book} id={selected.id}
            initialSection={linkedId === selected.id ? Number(citation.get("section")) : 0}
            quote={linkedId === selected.id ? citation.get("quote") : null} onGraphSaved={refresh} />}
        </DialogContent>
      </Dialog>
    </section>
  );
}

function MissingLinkedTranscription({ id, items }: { id: string | null; items: TranscriptionsState }): ReactElement | null {
  if (!id || !Array.isArray(items) || items.some((item) => item.id === id)) return null;
  return <p role="alert">A transcrição citada não está disponível.</p>;
}

function transcriptionLabel(item: ReaderTranscription): string {
  if (item.wholeBook) return "Livro inteiro · Markdown";
  if (!item.first) return "Livro inteiro · OCR";
  if (!item.last || item.first === item.last) return `Página ${item.first} · Markdown`;
  return `Páginas ${item.first}–${item.last} · Markdown`;
}

function TranscriptionList({ items, onSelect, onRemove }: { items: TranscriptionsState; onSelect: (item: ReaderTranscription) => void; onRemove: (item: ReaderTranscription) => void }): ReactElement {
  if (items === "loading") return <p role="status" className="text-sm text-muted-foreground">Procurando transcrições…</p>;
  if (items === "failed") return <p role="alert" className="text-sm">Não foi possível listar as transcrições deste livro.</p>;
  if (!items.length) return <p className="text-sm text-muted-foreground">Este livro ainda não tem transcrições salvas.</p>;
  return (
    <ul className="flex max-h-52 flex-wrap gap-2 overflow-auto">
      {items.map((item) => (
        <li key={item.id} className="flex items-center gap-1">
          <Button variant="outline" size="sm" title={item.id} onClick={() => onSelect(item)}>
            <FileTextIcon /> {transcriptionLabel(item)}
            <span className="text-muted-foreground">{new Intl.DateTimeFormat("pt-BR", { dateStyle: "short", timeStyle: "short" }).format(item.modifiedAt)}</span>
          </Button>
          <Button variant="ghost" size="icon-sm" aria-label={`Excluir transcrição: ${transcriptionLabel(item)}`} onClick={() => onRemove(item)}>
            <Trash2Icon />
          </Button>
        </li>
      ))}
    </ul>
  );
}

function RemoveTranscription({ book, item, onClose, onRemoved }: { book: string; item: ReaderTranscription; onClose: () => void; onRemoved: () => void }): ReactElement {
  const [pending, setPending] = useState(false);
  const remove = async (): Promise<void> => {
    setPending(true);
    try {
      const destination = await desktop.vault.trashReaderTranscription(book, item.id);
      if (destination === "vault") toast.success("Transcrição movida para a lixeira do vault (Transcricoes/.lixeira).");
      onRemoved();
      onClose();
    } catch {
      toast.error("Não foi possível mover a transcrição para a lixeira.");
      setPending(false);
    }
  };
  return (
    <Dialog open onOpenChange={(open) => { if (!open && !pending) onClose(); }}>
      <DialogContent showCloseButton={!pending}>
        <DialogHeader>
          <DialogTitle>Excluir transcrição?</DialogTitle>
          <DialogDescription>{transcriptionLabel(item)} será movida para a lixeira do sistema ou para a lixeira do vault. O PDF original continuará na Biblioteca.</DialogDescription>
        </DialogHeader>
        <div className="flex justify-end gap-2">
          <Button variant="outline" disabled={pending} onClick={onClose}>Cancelar</Button>
          <Button variant="destructive" disabled={pending} onClick={() => void remove()}>{pending ? "Excluindo…" : "Excluir transcrição"}</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

interface OpenTranscription {
  book: string;
  id: string;
  initialSection: number;
  quote: string | null;
  onGraphSaved: () => void;
}

function TranscriptionDocument({ book, id, initialSection, quote, onGraphSaved }: OpenTranscription): ReactElement {
  const [content, setContent] = useState<string | null>(null);
  const [failed, setFailed] = useState(false);
  useEffect(() => {
    let active = true;
    void desktop.vault.readReaderTranscription(book, id).then(
      (markdown) => { if (active) setContent(markdown.replace(/^\[PDF original\]\([^\n]+\)[^\n]*\n/mu, "")); },
      () => { if (active) setFailed(true); },
    );
    return (): void => { active = false; };
  }, [book, id]);
  if (failed) return <p role="alert">Não foi possível abrir a transcrição.</p>;
  if (content === null) return <p role="status">Abrindo transcrição…</p>;
  const [intro, ...sections] = content.split(/^<!-- neuralabs-reader-batch -->\r?\n/mu);
  return <ReadTranscription book={book} id={id} sections={sections.length ? sections : [intro]}
    initialSection={initialSection} quote={quote} onGraphSaved={onGraphSaved} />;
}

function ReadTranscription({ book, id, sections, initialSection, quote, onGraphSaved }: OpenTranscription & { sections: string[] }): ReactElement {
  const [section, setSection] = useState(() => findBookCitation(sections, initialSection, quote));
  const [readingRevision, setReadingRevision] = useState(0);
  const readingPane = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!quote) return;
    const blocks = readingPane.current?.querySelectorAll("p, li, h1, h2, h3, h4, h5, h6");
    const match = Array.from(blocks ?? []).find((block) => block.textContent?.replace(/\s+/gu, " ").includes(quote));
    match?.scrollIntoView({ block: "center" });
  }, [quote]);
  return (
    <>
      <BookAnalysisDraft book={book} id={id} sections={sections} currentPage={section + 1} onSaved={onGraphSaved} />
      <ReaderSemanticSearch book={book} id={id} onSection={(index) => {
        setSection(index);
        setReadingRevision((value) => value + 1);
      }} />
      {sections.length > 1 && (
        <label className="flex items-center gap-2">
          Páginas da transcrição
          <select className="rounded-md border bg-background p-1.5" value={section} onChange={(event) => setSection(Number(event.target.value))}>
            {sections.map((part, index) => (
              <option key={index} value={index}>{/^## (.+)$/mu.exec(part)?.[1] ?? `Seção ${index + 1}`}</option>
            ))}
          </select>
        </label>
      )}
      <div ref={readingPane} key={`${section}:${readingRevision}`} className="min-h-0 overflow-auto px-1 pb-4">
        <MarkdownContent image={({ src, alt }) => <LocalTranscriptionFigure book={book} id={id} source={typeof src === "string" ? src : ""} alt={alt ?? ""} />}>
          {sections[section]}
        </MarkdownContent>
      </div>
    </>
  );
}

/** Displays one vault image referenced by a transcription. */
export function LocalTranscriptionFigure({ book, id, source, alt }: { book: string; id: string; source: string; alt: string }): ReactElement | null {
  const name = /^imagens\/([\w-]+\.png)$/iu.exec(source)?.[1];
  const [data, setData] = useState<string | null>(null);
  const [missing, setMissing] = useState(false);
  useEffect(() => {
    if (!name) return undefined;
    let active = true;
    void desktop.vault.readReaderTranscriptionImage(book, id, name).then(
      (image) => { if (active) { setData(image); setMissing(!image); } },
      () => { if (active) setMissing(true); },
    );
    return (): void => { active = false; };
  }, [book, id, name]);
  if (!name) return null;
  if (missing) return <span className="text-muted-foreground">Figura indisponível.</span>;
  if (!data) return null;
  return <img alt={alt} src={`data:image/png;base64,${data}`} loading="lazy" className="my-3 mx-auto h-auto max-w-full rounded-md" />;
}
