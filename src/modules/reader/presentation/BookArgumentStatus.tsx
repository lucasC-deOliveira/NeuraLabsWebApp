import { useEffect, useState, type ReactElement } from "react";
import type { BookArgumentProgress } from "../application/analyze-book-arguments";

const phaseLabels = {
  generating: "Aguardando a análise do trecho pelo provedor de IA configurado.",
  checking: "Conferindo as citações no texto da transcrição.",
  review: "Montando o rascunho para sua revisão.",
};

/** Shows completed passages and the current work without inventing a time estimate. */
export function BookArgumentStatus({ progress, stopping }: {
  progress: BookArgumentProgress | null;
  stopping: boolean;
}): ReactElement {
  const [seconds, setSeconds] = useState(0);
  useEffect(() => {
    const start = Date.now();
    const clock = window.setInterval(() => setSeconds(Math.floor((Date.now() - start) / 1000)), 1000);
    return () => window.clearInterval(clock);
  }, []);
  const time = `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, "0")}`;
  return (
    <div className="space-y-2 rounded-md border bg-muted/30 p-3">
      <div className="flex justify-between gap-2">
        <strong>Análise do livro em andamento</strong>
        <span aria-label="Tempo decorrido" className="tabular-nums text-muted-foreground">{time}</span>
      </div>
      <div role="status" className="space-y-1">
        {progress?.chapter && <p className="font-medium">Trecho {progress.completed + 1} de {progress.total} · {progress.chapter}</p>}
        <p>{stopping ? "Parando após a resposta do modelo para o trecho atual."
          : progress ? phaseLabels[progress.phase] : "Preparando os trechos da transcrição."}</p>
        <p className="text-muted-foreground">{progress ? `${progress.completed} de ${progress.total} trechos concluídos`
          : "As sugestões aparecerão aqui para revisão."}</p>
      </div>
      <progress aria-label="Trechos concluídos" className="h-2 w-full accent-primary"
        max={progress?.total || 1} value={progress?.completed} />
    </div>
  );
}
