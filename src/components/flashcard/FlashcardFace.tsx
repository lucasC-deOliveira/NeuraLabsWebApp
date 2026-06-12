"use client";

import { MarkdownContent } from "@/components/markdown-content";

// Face do flashcard compartilhada entre estudar/ver. As classes .fc-* são os
// pontos de customização (presets ou CSS personalizado em CardStyleProvider);
// as classes Tailwind dão o visual padrão ("Clássico") quando não há CSS extra.
export function FlashcardFace({
  pergunta,
  resposta,
  conceito,
  showAnswer,
}: {
  pergunta: string;
  resposta: string;
  conceito?: string | null;
  showAnswer: boolean;
}) {
  return (
    <div className="fc-scope">
      <div className="fc-card flex flex-col gap-4">
        <div className="fc-pergunta rounded-xl border bg-card p-4">
          <span className="fc-label text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
            Pergunta
          </span>
          <div className="fc-pergunta-body mt-1 text-base font-medium">
            <MarkdownContent>{pergunta}</MarkdownContent>
          </div>
        </div>

        {showAnswer && (
          <div className="fc-resposta rounded-xl border border-primary/30 bg-muted/40 p-4">
            <span className="fc-label text-[10px] font-semibold uppercase tracking-wider text-primary">
              Resposta
            </span>
            <div className="fc-resposta-body mt-1 text-sm">
              <MarkdownContent>{resposta}</MarkdownContent>
            </div>
            {conceito && (
              <p className="fc-conceito mt-2 text-xs font-medium text-muted-foreground">
                Conceito: {conceito}
              </p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
