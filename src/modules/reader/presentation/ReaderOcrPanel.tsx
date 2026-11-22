import { useEffect, useState, type ReactElement } from "react";
import { ScanTextIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { ReaderOcrLanguage, ReaderOcrPage } from "@contracts/reader-ocr";
import type { LocalPdf } from "../infra/pdf-reader";
import { hasEmbeddedPageText } from "../domain/reader-page-format";

interface ReaderOcrPanelProps {
  book: LocalPdf;
  page: number;
  relative: string;
  result?: ReaderOcrPage;
  available: boolean;
  pendingPage: number | null;
  failed: boolean;
  runningBook: boolean;
  onRecognize: (page: number, language: ReaderOcrLanguage) => Promise<void>;
  onRecognizeBook: (language: ReaderOcrLanguage) => Promise<void>;
  onStop: () => void;
  onCopy: (text: string) => void;
}

/** Offers local text recognition for the current page of a PDF. */
export function ReaderOcrPanel({ book, page, relative, result, available, pendingPage, failed, runningBook, onRecognize, onRecognizeBook, onStop, onCopy }: ReaderOcrPanelProps): ReactElement {
  const preference = `neuralabs.reader-ocr.language:${relative}`;
  const [language, setLanguage] = useState<ReaderOcrLanguage>(() => localStorage.getItem(preference) === "en" ? "en" : "pt");
  const [hasText, setHasText] = useState<boolean | null>(null);
  useEffect(() => {
    let active = true;
    void book.readPageText(page).then(
      (text) => { if (active) setHasText(hasEmbeddedPageText(text)); },
      () => { if (active) setHasText(false); },
    );
    return (): void => { active = false; };
  }, [book, page]);
  const busy = pendingPage !== null;
  return (
    <section className="space-y-2 rounded-lg border bg-card p-3">
      <div className="flex flex-wrap items-center gap-2">
        <label className="flex items-center gap-2 text-sm">
          Idioma do OCR
          <select className="rounded-md border bg-background p-1.5" value={language} disabled={busy} onChange={(event) => {
            const next = event.currentTarget.value === "en" ? "en" : "pt";
            setLanguage(next);
            localStorage.setItem(preference, next);
          }}>
            <option value="pt">Português</option><option value="en">Inglês</option>
          </select>
        </label>
        {(hasText === false || result) && (
          <Button variant="outline" size="sm" disabled={!available || busy} onClick={() => void onRecognize(page, language)}>
            <ScanTextIcon /> {result ? "Reconhecer novamente" : "Reconhecer texto"}
          </Button>
        )}
        <Button variant="outline" size="sm" disabled={!available || busy} onClick={() => void onRecognizeBook(language)}>
          Reconhecer livro para busca
        </Button>
      </div>
      {busy && <RecognitionProgress page={pendingPage} total={book.pageCount} runningBook={runningBook} onStop={onStop} />}
      {failed && <p role="alert" className="text-sm">Não foi possível concluir a operação. Confira se o serviço <code>reader-ocr</code> está ativo e se o vault permite gravação.</p>}
      {result && <RecognizedPage result={result} onCopy={onCopy} />}
    </section>
  );
}

function RecognitionProgress({ page, total, runningBook, onStop }: { page: number; total: number; runningBook: boolean; onStop: () => void }): ReactElement {
  if (!runningBook) return <p role="status" className="text-sm">Reconhecendo a página {page}…</p>;
  return (
    <div className="flex flex-wrap items-center gap-3">
      <p role="status" className="text-sm">Processando página {page} de {total}…</p>
      <progress aria-label="Progresso da transcrição" max={total} value={page - 1} />
      <Button variant="ghost" size="sm" onClick={onStop}>Parar</Button>
    </div>
  );
}

function RecognizedPage({ result, onCopy }: { result: ReaderOcrPage; onCopy: (text: string) => void }): ReactElement {
  if (!result.text) return <p role="status" className="text-sm">O OCR não encontrou texto nesta página.</p>;
  return (
    <details open className="space-y-2 text-sm">
      <summary className="cursor-pointer font-medium">Texto reconhecido · {result.language === "en" ? "Inglês" : "Português"}</summary>
      <p className="max-h-64 overflow-auto whitespace-pre-wrap rounded bg-muted p-3">{result.text}</p>
      <Button size="sm" variant="outline" onClick={() => onCopy(result.text)}>Copiar citação da página</Button>
    </details>
  );
}
