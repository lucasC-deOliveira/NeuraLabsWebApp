import { useState, type FormEvent, type ReactElement } from "react";
import { Button } from "@/components/ui/button";
import { desktop } from "@/lib/vault-bridge";
import type { ReaderConversionProgress, ReaderConversionResult } from "@contracts/reader-conversion";

type ConversionStatus = { phase: "idle" | "converting" | "failed" } |
  { phase: "success"; result: ReaderConversionResult };

/** Converts the whole PDF locally and reports progress across the document. */
export function ConvertReaderMarkdown({ relative, onConverted }: { relative: string; onConverted: () => void }): ReactElement {
  const [status, setStatus] = useState<ConversionStatus>({ phase: "idle" });
  const [progress, setProgress] = useState<ReaderConversionProgress | null>(null);
  const convert = async (event: FormEvent<HTMLFormElement>): Promise<void> => {
    event.preventDefault();
    const fields = new FormData(event.currentTarget);
    const language = fields.get("language") === "en" ? "en" : "pt";
    if (status.phase === "converting") return;
    const jobId = crypto.randomUUID();
    setProgress(null);
    setStatus({ phase: "converting" });
    const unsubscribe = desktop.vault.onReaderConversionProgress((event) => {
      if (event.jobId === jobId) setProgress(event);
    });
    try {
      const result = await desktop.vault.convertReaderMarkdown({ relative, language, jobId });
      setStatus({ phase: "success", result });
      onConverted();
    } catch {
      setStatus({ phase: "failed" });
    } finally {
      unsubscribe();
    }
  };

  return (
    <details className="rounded-lg border bg-card p-3 text-sm">
      <summary className="cursor-pointer font-medium">Converter livro para Markdown</summary>
      <form onSubmit={(event) => void convert(event)} className="mt-3 flex flex-wrap items-end gap-3">
        <label className="grid gap-1">
          Idioma em páginas escaneadas
          <select className="rounded-md border bg-background p-2" name="language" defaultValue={localStorage.getItem(`neuralabs.reader-ocr.language:${relative}`) === "en" ? "en" : "pt"}>
            <option value="pt">Português</option>
            <option value="en">Inglês</option>
          </select>
        </label>
        <Button type="submit" disabled={status.phase === "converting"}>Converter livro inteiro</Button>
      </form>
      {status.phase === "converting" && <ConversionProgress progress={progress} />}
      {status.phase === "failed" && <p role="alert" className="mt-2">Não foi possível converter o PDF. Confira se o serviço local <code>document-converter</code> está ativo e se o vault permite gravação.</p>}
      {status.phase === "success" && (
        <p role="status" className="mt-2 break-words">Markdown salvo em <code>{status.result.markdownPath}</code> · {status.result.imageCount} figura(s).</p>
      )}
    </details>
  );
}

function ConversionProgress({ progress }: { progress: ReaderConversionProgress | null }): ReactElement {
  if (!progress) return <p role="status" className="mt-2">Preparando o livro para conversão…</p>;
  return (
    <div className="mt-2 flex flex-wrap items-center gap-2">
      <p role="status">{progress.completed} de {progress.total} páginas convertidas.</p>
      <progress aria-label="Progresso da conversão" max={progress.total} value={progress.completed} />
    </div>
  );
}
