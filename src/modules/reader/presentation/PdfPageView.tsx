import { useEffect, useRef, useState, type ReactElement } from "react";
import { drawLocalPdfPage, type LocalPdf } from "../infra/pdf-reader";
import "./pdf-selection.css";

interface PdfPageViewProps {
  book: LocalPdf;
  page: number;
  scale: number;
  fitWidth?: boolean;
  onSelection: (text: string) => void;
}

/** Renders a selectable PDF page, for example <PdfPageView book={book} page={1} scale={1} onSelection={select} />. */
export function PdfPageView({ book, page, scale, fitWidth = false, onSelection }: PdfPageViewProps): ReactElement {
  const reader = useRef<HTMLDivElement>(null);
  const canvas = useRef<HTMLCanvasElement>(null);
  const layer = useRef<HTMLDivElement>(null);
  const [status, setStatus] = useState<"loading" | "ready" | "failed">("loading");
  const [width, setWidth] = useState<number | null>(null);
  useEffect(() => {
    const container = reader.current;
    if (!fitWidth || !container) return;
    const observer = new ResizeObserver(([entry]) => setWidth(Math.max(1, Math.floor(entry.contentRect.width))));
    observer.observe(container);
    return (): void => observer.disconnect();
  }, [fitWidth]);
  useEffect(() => {
    const execution = new AbortController();
    const { signal } = execution;
    const surface = canvas.current;
    const text = layer.current;
    if (!surface || !text) return undefined;
    if (fitWidth && width === null) return undefined;
    void book.getPage(page).then((pdfPage) => {
      const fitted = fitWidth && width ? width / pdfPage.getViewport({ scale: 1 }).width : 1;
      return drawLocalPdfPage(pdfPage, surface, text, scale * fitted, signal);
    }).then(
      () => { if (!signal.aborted) setStatus("ready"); },
      () => { if (!signal.aborted) setStatus("failed"); },
    );
    return (): void => execution.abort();
  }, [book, page, scale, fitWidth, width]);

  const capture = (): void => {
    const selection = window.getSelection();
    if (!selection?.anchorNode || !selection.focusNode) return;
    if (layer.current?.contains(selection.anchorNode) && layer.current.contains(selection.focusNode)) {
      onSelection(selection.toString().trim());
    }
  };

  return (
    <div ref={reader} className={fitWidth ? "overflow-auto rounded-md bg-muted/70 p-2" : "min-h-[30rem] overflow-auto rounded-lg bg-muted/70 p-3 md:p-6"}>
      {status === "loading" && <p role="status" className="text-sm text-muted-foreground">Carregando página…</p>}
      {status === "failed" && <p role="alert">Não foi possível exibir esta página.</p>}
      <div className={`relative mx-auto w-max bg-white shadow ${status === "ready" ? "" : "invisible"}`}>
        <canvas ref={canvas} aria-label={`Página ${page} do PDF`} className="block" />
        <div ref={layer} className="reader-pdf-text" onPointerUp={capture} onKeyUp={capture} />
      </div>
    </div>
  );
}
