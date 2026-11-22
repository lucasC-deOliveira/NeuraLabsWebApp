import { useEffect, useRef, useState, type ReactElement } from "react";
import { Button } from "@/components/ui/button";
import { analyzeBookArguments, type BookArgumentProgress } from "../application/analyze-book-arguments";
import { analyzeBookSections, type BookAnalysis } from "../domain/book-analysis";
import { analyzeProxyBookPassage } from "../infra/book-arguments-proxy";
import { BookArgumentStatus } from "./BookArgumentStatus";
import { BookArgumentScope, type BookArgumentSelection } from "./BookArgumentScope";

type GenerationState = "idle" | "failed" | { progress: BookArgumentProgress | null };

/** Builds a draft locally and reports passage progress before review. */
export function GenerateBookArgumentMap({ sections, currentPage, onDraft }: {
  sections: string[]; currentPage: number; onDraft: (draft: BookAnalysis) => void;
}): ReactElement {
  const execution = useRef<AbortController | null>(null);
  const [generation, setGeneration] = useState<GenerationState>("idle");
  const [stopping, setStopping] = useState(false);
  useEffect(() => () => execution.current?.abort(), []);
  const run = async ({ sections: source, ...scope }: BookArgumentSelection, simple: boolean): Promise<void> => {
    if (execution.current) return;
    if (simple) {
      onDraft({ ...analyzeBookSections(source), scope });
      return;
    }
    const task = new AbortController();
    execution.current = task;
    setGeneration({ progress: null });
    setStopping(false);
    try {
      const draft = await analyzeBookArguments(source, analyzeProxyBookPassage, (progress) => setGeneration({ progress }), task.signal);
      if (!task.signal.aborted) onDraft({ ...draft, scope });
    } catch {
      if (!task.signal.aborted) setGeneration("failed");
    } finally {
      if (execution.current === task) execution.current = null;
      if (task.signal.aborted) setGeneration("idle");
    }
  };
  const running = typeof generation === "object";
  return (
    <div className="mt-2 space-y-2 text-sm">
      {running ? <BookArgumentStatus progress={generation.progress} stopping={stopping} />
        : <p>Os trechos selecionados serão enviados ao provedor de IA configurado no app.</p>}
      {generation === "failed" && <p role="alert">Não foi possível concluir a análise. Confira a conexão com o servidor e o proxy em Configurações de IA.</p>}
      <BookArgumentScope sections={sections} currentPage={currentPage} busy={running} onRun={(source, simple) => void run(source, simple)} />
      <div className="flex flex-wrap gap-2">
        {running && <Button size="sm" variant="ghost" disabled={stopping} onClick={() => {
          execution.current?.abort();
          setStopping(true);
        }}>Parar análise</Button>}
      </div>
    </div>
  );
}
