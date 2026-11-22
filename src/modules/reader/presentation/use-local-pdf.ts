import { useEffect, useState } from "react";
import { desktop } from "@/lib/vault-bridge";
import { openLocalPdf, type LocalPdf } from "../infra/pdf-reader";

interface LocalPdfState {
  book: LocalPdf | null;
  error: boolean;
}

/** Loads a selected PDF and disposes its worker on close, e.g. useLocalPdf("Manual.pdf"). */
export function useLocalPdf(file: string): LocalPdfState {
  const [state, setState] = useState<LocalPdfState>({ book: null, error: false });
  useEffect(() => {
    const execution = new AbortController();
    const { signal } = execution;
    const load = async (): Promise<void> => {
      try {
        const book = await openLocalPdf(await desktop.vault.readLibraryPdf(file), signal);
        if (!signal.aborted) setState({ book, error: false });
      } catch {
        if (!signal.aborted) setState({ book: null, error: true });
      }
    };
    void load();
    return (): void => execution.abort();
  }, [file]);
  return state;
}
